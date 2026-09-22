import { Route, Routes } from "react-router-dom"
import { Signup } from "./pages/signup"
import { Login } from "./pages/login"
import { MeetRoom } from "./pages/meetRoom"
import { LiveRoom } from "./pages/liveRoom"



function App() {

  return (
    <div>
      <Routes>
        <Route path="/" element={<Signup/>} />
        <Route path="/login" element={<Login/>}/>
        <Route path="/meetRoom" element={<MeetRoom/>}/>
        <Route path="/liveroom" element={<LiveRoom />}/>
      </Routes>
    </div>
  )
}

export default App
