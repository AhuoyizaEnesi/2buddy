import socketio
import asyncio
import os
import redis.asyncio as aioredis
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
REDIS_URL = os.getenv("REDIS_URL")

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

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
    if trigger_type == "auto_check":
        system_prompt = (
            "You are silently monitoring two students working on a problem together on a whiteboard. "
            "Your job is to look for clear conceptual errors or mistakes in their reasoning or calculations. "
            "If you see a clear error, respond with a short, clear, friendly note pointing out the issue without giving the answer. "
            "If everything looks correct, or you cannot clearly identify an error, respond with exactly: NO_ERROR "
            "Do not explain yourself. Do not add pleasantries. Either point out the error or say NO_ERROR."
        )
    elif trigger_type == "stuck":
        system_prompt = (
            "You are a Socratic tutor helping two students who are stuck on a problem. "
            "Look at their whiteboard and the problem. Ask them one guiding question that nudges them "
            "toward the next step without giving the answer away. Be concise and encouraging."
        )
    else:
        system_prompt = (
            "You are a professor reviewing two students' work on a whiteboard. "
            "Give constructive feedback on their approach. Tell them what they are doing right, "
            "what could be improved, and whether their overall direction is correct. "
            "Do not give the final answer. Be encouraging and specific."
        )

    message_content = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": canvas_base64
            }
        },
        {
            "type": "text",
            "text": f"The problem the students are working on: {problem_description}"
        }
    ]

    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=system_prompt,
        messages=[{"role": "user", "content": message_content}]
    )

    return response.content[0].text


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
    except Exception as e:
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
    await save_canvas_to_redis(room_code, "")
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