import axios from "axios";
import { useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export function Login() {
    const username = useRef<HTMLInputElement>(null);
    const password = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();

    async function handlelogin() {
        const toastId = toast.loading("Loading...");

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_SERVER_URL}/api/v1/login`,
                {
                    username: username.current?.value,
                    password: password.current?.value,
                }
            );

            if (response.data.success) {
                // Save JWT for WebSocket connection
                localStorage.setItem("token", response.data.token);

                toast.success(response.data.message);

                navigate("/meetRoom");
            } else {
                toast.error("Error in login");
            }
        } catch (error) {
            toast.error("Error in login");
        } finally {
            toast.dismiss(toastId);
        }
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center flex-col">
            <div className="border-2 border-black rounded-md p-6">

                <div className="mb-4">
                    <p>Username</p>
                    <input
                        ref={username}
                        placeholder="Username"
                        className="border border-black p-2"
                    />
                </div>

                <div className="mb-4">
                    <p>Password</p>
                    <input
                        type="password"
                        ref={password}
                        placeholder="Password"
                        className="border border-black p-2"
                    />
                </div>

                <button
                    onClick={handlelogin}
                    className="border border-black px-4 py-2"
                >
                    Login
                </button>

            </div>
            <div className="flex flex-col border border-black p-3 mt-3">
                <p>Test credentials</p>
                <p>Username1 - shubh</p>
                <p>Username2 - shubh_351</p>
                <p>Password - 12345</p>
                <p>Password is same for both username</p>
            </div>
        </div>
    );
}