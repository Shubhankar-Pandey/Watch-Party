import axios from "axios";
import { useRef } from "react"
import toast from "react-hot-toast";
import { NavLink, useNavigate } from "react-router-dom";




export function Signup(){
    const username = useRef<HTMLInputElement>(null);
    const password = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    async function handleSignup(){
        const toastId = toast.loading("Loading...");
        try{
            const response = await axios.post("http://localhost:3000/api/v1/signup", 
                {
                    username : username.current?.value,
                    password : password.current?.value,
                });

            console.log("Response = ", response.data);
            
            if(response.data.success){
                toast.success("Signup success");
                navigate("/login");
            }
            else{
                toast.error("Error in signup")
            }
        }
        catch(error){
            toast.error("Error in signup")
        }
        finally{
            toast.dismiss(toastId);
        }
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center">
            <div className="border-2 border-black rounded-md p-3 flex items-center justify-center gap-3 flex-col">
                <div className="">
                    <p>Username</p>
                    <input ref={username} placeholder="Username" className="border border-black p-2"/>
                </div>
                <div className="">
                    <p>Password</p>
                    <input type="password" ref={password} placeholder="Password" className="border border-black p-2"/>
                </div>
                <div onClick={() => handleSignup()} className="border border-black p-2">
                    Signup
                </div>
                <NavLink className={"text-blue-500 m-3 border border-blue-600 p-2"} to={"/login"}>Go to login page</NavLink>
            </div>
        </div>
    )
}