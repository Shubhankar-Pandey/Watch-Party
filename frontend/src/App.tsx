import { Route, Routes } from "react-router-dom"
import { Signup } from "./pages/signup"
import { Login } from "./pages/login"
import { MeetRoom } from "./pages/meetRoom"
import { LiveRoom } from "./pages/liveRoom"
import { ProtectedRoute } from "./protectedRoute"



function App() {

  return (
    <div>
      <Routes>
        <Route path="/" element={<Signup/>} />
        <Route path="/login" element={<Login/>}/>

        <Route element={<ProtectedRoute />}>
          <Route path="/meetRoom" element={<MeetRoom/>}/>
          <Route path="/liveroom" element={<LiveRoom />}/>
        </Route>
      </Routes>
    </div>
  )
}

export default App
