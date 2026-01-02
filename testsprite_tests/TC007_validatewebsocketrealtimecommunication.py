import asyncio
import websockets
import json
import time

BASE_URL = "ws://localhost:3000"

async def test_validate_websocket_realtime_communication():
    """
    Test real-time communication APIs using WebSocket channels for chat, forums, and notifications
    to ensure reliable message delivery with minimal latency.
    """

    async def test_channel(channel_name, send_message):
        uri = f"{BASE_URL}/ws/{channel_name}"
        try:
            async with websockets.connect(uri, ping_timeout=30, close_timeout=10) as websocket:
                # Send message
                send_time = time.time()
                await websocket.send(send_message)

                # Receive echo or response
                response = await asyncio.wait_for(websocket.recv(), timeout=30)
                receive_time = time.time()

                # Validate message received equals sent message
                assert response == send_message, f"Expected '{send_message}', got '{response}'"

                # Validate latency is minimal (e.g., less than 1 second)
                latency = receive_time - send_time
                assert latency < 1, f"Latency too high on channel '{channel_name}': {latency:.2f}s"

        except asyncio.TimeoutError:
            assert False, f"Timeout waiting for message on channel '{channel_name}'"
        except websockets.exceptions.InvalidStatusCode as e:
            assert False, f"Failed to connect to WebSocket endpoint '{uri}': {e}"
        except Exception as e:
            assert False, f"Unexpected error on channel '{channel_name}': {e}"

    # Define test messages for channels
    test_cases = {
        "chat": json.dumps({"type": "message", "content": "Test chat message"}),
        "forums": json.dumps({"type": "post", "title": "Test Post", "body": "This is a forum test post"}),
        "notifications": json.dumps({"type": "notification", "content": "Test notification"}),
    }

    # Run tests concurrently for all channels
    await asyncio.gather(*(test_channel(channel, message) for channel, message in test_cases.items()))

# Run the test
asyncio.get_event_loop().run_until_complete(test_validate_websocket_realtime_communication())