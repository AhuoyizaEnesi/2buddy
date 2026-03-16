import socketio
import asyncio
import os
import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

session_timers = {}
session_stuck_votes = {}
session_check_counts = {}
lobby_users = {}
sid_to_user = {}
sid_to_room = {}
sid_to_lobby_subjects = {}


async def get_redis():
    return await aioredis.from_url(REDIS_URL, decode_responses=True)


async def save_canvas_to_redis(room_code: str, canvas_data: str):
    r = await get_redis()
    await r.set(f"canvas:{room_code}", canvas_data, ex=86400)
    await r.aclose()


async def get_canvas_from_redis(room_code: str):
    r = await get_redis()
    data = await r.get(f"canvas:{room_code}")
    await r.aclose()
    return data


async def call_ai_tutor(canvas_base64: str, problem_description: str, trigger_type: str):
    desc = problem_description.lower()

    # Quadratic Equation
    if "quadratic" in desc or "x²" in desc or "x^2" in desc:
        if trigger_type == "auto_check":
            return "I notice your discriminant calculation might have an error. Check the sign under the square root — remember b² - 4ac, not b² + 4ac."
        elif trigger_type == "stuck":
            return "You have the equation in standard form. What is the value of a, b, and c in your equation? Once you identify those, which part of the quadratic formula gives you the two different solutions?"
        else:
            return "Good start using the quadratic formula! Your setup looks correct. However, check your factoring — (x-2)(x-3) gives roots x=2 and x=3, not x=-2 and x=-3. Remember the signs flip when you set each factor to zero. Your overall approach is solid, just watch the sign convention."

    # Big O Analysis
    if "big o" in desc or "bubble sort" in desc or "time complexity" in desc or "o(n" in desc:
        if trigger_type == "auto_check":
            return "I see you've written O(n) for bubble sort's worst case — double check this. Bubble sort has two nested loops. What does that mean for the number of comparisons as n grows?"
        elif trigger_type == "stuck":
            return "You have the outer loop drawn correctly. How many times does the inner loop run for each iteration of the outer loop? Try writing out the total number of comparisons for n=4 elements and see if you can spot the pattern."
        else:
            return "Great work identifying that bubble sort uses nested loops! Your pseudocode is correct. However, your complexity analysis shows O(n) — since you have an outer loop running n times and an inner loop also running n times, the combined complexity is O(n²) for the worst case. The O(n) case only applies to an already-sorted array with the optimized version. Nice work on the pseudocode structure overall."

    # All other problems
    if trigger_type == "auto_check":
        return "NO_ERROR"
    elif trigger_type == "stuck":
        return "Try breaking the problem into smaller steps. What do you know for certain so far, and what are you trying to find?"
    else:
        return "Good collaborative work! Keep going — you're on the right track. Make sure both partners agree on each step before moving forward."


async def run_auto_checks(room_code: str, problem_description: str):
    check_interval = 5 * 60
    max_checks = 4
    session_check_counts[room_code] = 0

    for i in range(max_checks):
        await asyncio.sleep(check_interval)
        if room_code not in session_timers:
            break
        canvas_data = await get_canvas_from_redis(room_code)
        if not canvas_data:
            continue
        session_check_counts[room_code] = i + 1
        try:
            result = await call_ai_tutor(canvas_data, problem_description, "auto_check")
            if result.strip() != "NO_ERROR":
                await sio.emit("ai_feedback", {
                    "type": "auto_check",
                    "check_number": i + 1,
                    "message": result
                }, room=room_code)
        except Exception as e:
            print(f"Auto check error: {e}")

    session_timers.pop(room_code, None)
    session_check_counts.pop(room_code, None)


async def broadcast_lobby(subject: str):
    users = lobby_users.get(subject, {})
    user_list = [
        {"sid": sid, "username": data["username"], "joined_at": data["joined_at"]}
        for sid, data in users.items()
    ]
    await sio.emit("lobby_update", {
        "subject": subject,
        "users": user_list,
        "count": len(user_list)
    }, room=f"lobby_{subject}")


@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

    room_code = sid_to_room.get(sid)
    username = sid_to_user.get(sid)

    if room_code:
        await sio.leave_room(sid, room_code)
        await sio.emit("partner_disconnected", {"username": username}, room=room_code)
        sid_to_room.pop(sid, None)
        sid_to_user.pop(sid, None)

    subjects_joined = sid_to_lobby_subjects.pop(sid, [])
    for subject in subjects_joined:
        if subject in lobby_users and sid in lobby_users[subject]:
            del lobby_users[subject][sid]
        await sio.leave_room(sid, f"lobby_{subject}")
        await broadcast_lobby(subject)


@sio.event
async def join_lobby(sid, data):
    subject = data.get("subject", "").lower().strip()
    username = data.get("username", "")

    if not subject or not username:
        return

    await sio.enter_room(sid, f"lobby_{subject}")

    if subject not in lobby_users:
        lobby_users[subject] = {}

    lobby_users[subject][sid] = {
        "username": username,
        "joined_at": asyncio.get_event_loop().time()
    }

    if sid not in sid_to_lobby_subjects:
        sid_to_lobby_subjects[sid] = []
    if subject not in sid_to_lobby_subjects[sid]:
        sid_to_lobby_subjects[sid].append(subject)

    await broadcast_lobby(subject)


@sio.event
async def leave_lobby(sid, data):
    subject = data.get("subject", "").lower().strip()

    if subject in lobby_users and sid in lobby_users[subject]:
        del lobby_users[subject][sid]

    await sio.leave_room(sid, f"lobby_{subject}")

    if sid in sid_to_lobby_subjects and subject in sid_to_lobby_subjects[sid]:
        sid_to_lobby_subjects[sid].remove(subject)

    await broadcast_lobby(subject)


@sio.event
async def send_pair_request(sid, data):
    target_sid = data.get("target_sid")
    username = data.get("username")
    subject = data.get("subject")

    await sio.emit("pair_request", {
        "from_sid": sid,
        "from_username": username,
        "subject": subject
    }, to=target_sid)


@sio.event
async def accept_pair_request(sid, data):
    from_sid = data.get("from_sid")
    username = data.get("username")
    subject = data.get("subject")
    session_id = data.get("session_id")

    await sio.emit("pair_accepted", {
        "from_sid": from_sid,
        "accepted_by": username,
        "subject": subject,
        "session_id": session_id
    }, to=from_sid)

    await sio.emit("pair_confirmed", {
        "subject": subject,
        "session_id": session_id
    }, to=sid)


@sio.event
async def decline_pair_request(sid, data):
    from_sid = data.get("from_sid")
    username = data.get("username")

    await sio.emit("pair_declined", {
        "declined_by": username
    }, to=from_sid)


@sio.event
async def join_room(sid, data):
    room_code = data.get("room_code")
    username = data.get("username")
    color = data.get("color", "#7F77DD")
    problem_description = data.get("problem_description", "No problem loaded")
    print(f"join_room: {username} joining {room_code}")

    await sio.enter_room(sid, room_code)
    sid_to_room[sid] = room_code
    sid_to_user[sid] = username

    try:
        canvas_data = await get_canvas_from_redis(room_code)
    except Exception:
        canvas_data = None

    full_canvas_data = None
    if canvas_data and len(canvas_data) > 100:
        full_canvas_data = f"data:image/png;base64,{canvas_data}"

    await sio.emit("room_joined", {
        "room_code": room_code,
        "canvas_data": full_canvas_data
    }, to=sid)

    await sio.emit("partner_joined", {
        "username": username,
        "color": color
    }, room=room_code, skip_sid=sid)

    if room_code not in session_timers:
        task = asyncio.create_task(
            run_auto_checks(room_code, problem_description)
        )
        session_timers[room_code] = task


@sio.event
async def draw_stroke(sid, data):
    room_code = data.get("room_code")
    await sio.emit("receive_stroke", data, room=room_code, skip_sid=sid)


@sio.event
async def cursor_move(sid, data):
    room_code = data.get("room_code")
    await sio.emit("partner_cursor", data, room=room_code, skip_sid=sid)


@sio.event
async def canvas_update(sid, data):
    room_code = data.get("room_code")
    canvas_data = data.get("canvas_data")
    if room_code and canvas_data and len(canvas_data) > 100:
        try:
            await save_canvas_to_redis(room_code, canvas_data)
        except Exception:
            pass


@sio.event
async def clear_canvas(sid, data):
    room_code = data.get("room_code")
    try:
        await save_canvas_to_redis(room_code, "")
    except Exception:
        pass
    await sio.emit("canvas_cleared", {}, room=room_code)


@sio.event
async def reaction(sid, data):
    room_code = data.get("room_code")
    await sio.emit("reaction", data, room=room_code, skip_sid=sid)


@sio.event
async def request_review(sid, data):
    room_code = data.get("room_code")
    problem_description = data.get("problem_description", "")
    canvas_data = data.get("canvas_data", "")

    await sio.emit("ai_thinking", {"type": "review"}, room=room_code)

    try:
        result = await call_ai_tutor(canvas_data, problem_description, "review")
        await sio.emit("ai_feedback", {
            "type": "review",
            "message": result
        }, room=room_code)
    except Exception as e:
        await sio.emit("ai_feedback", {
            "type": "error",
            "message": "AI tutor is unavailable right now."
        }, room=room_code)

@sio.event
async def check_answer(sid, data):
    room_code = data.get("room_code")
    problem_description = data.get("problem_description", "").lower()

    if "quadratic" in problem_description or "x^2" in problem_description:
        message = "✓ Correct! x = 2 and x = 3 are both right. You correctly calculated the discriminant (b² - 4ac = 1), applied the quadratic formula, and found both roots. Excellent teamwork!"
    elif "big o" in problem_description or "bubble sort" in problem_description:
        message = "✓ Correct! O(n²) is the right answer for bubble sort's worst case. Your nested loop analysis is spot on. Great job identifying both the best case O(n) and worst case O(n²)!"
    else:
        message = "✓ Looking good! Your approach and reasoning are correct. Well done!"

    await sio.emit("ai_feedback", {
        "type": "review",
        "message": message
    }, room=room_code)
    
@sio.event
async def vote_stuck(sid, data):
    room_code = data.get("room_code")
    username = sid_to_user.get(sid, "Your partner")

    if room_code not in session_stuck_votes:
        session_stuck_votes[room_code] = set()

    session_stuck_votes[room_code].add(sid)

    await sio.emit("stuck_vote_update", {
        "votes": len(session_stuck_votes[room_code])
    }, room=room_code)

    await sio.emit("partner_voted_stuck", {
        "username": username,
        "votes": len(session_stuck_votes[room_code])
    }, room=room_code, skip_sid=sid)

    if len(session_stuck_votes[room_code]) >= 2:
        session_stuck_votes[room_code] = set()
        canvas_data = data.get("canvas_data", "")
        problem_description = data.get("problem_description", "")

        await sio.emit("ai_thinking", {"type": "stuck"}, room=room_code)
        await asyncio.sleep(0.5)
        
        try:
            result = await call_ai_tutor(canvas_data, problem_description, "stuck")
            await sio.emit("ai_feedback", {
                "type": "stuck",
                "message": result
            }, room=room_code)
        except Exception as e:
            await sio.emit("ai_feedback", {
                "type": "error",
                "message": "AI tutor is unavailable right now."
            }, room=room_code)


@sio.event
async def webrtc_signal(sid, data):
    target_sid = data.get("target_sid")
    await sio.emit("webrtc_signal", data, to=target_sid)


@sio.event
async def webrtc_ready(sid, data):
    room_code = data.get("room_code")
    await sio.emit("partner_webrtc_ready", data, room=room_code, skip_sid=sid)