
import './App.css'
import {invoke} from "@tauri-apps/api";
import {listen} from "@tauri-apps/api/event";
import {IZone} from "./interfaces.ts";


function App() {

    listen("heartbeat", (event) => {
        console.log(event.payload)
    })

    listen("zones", (event) => {
        console.log(event)
    })
  setInterval(sendheartbeat, 7000)


  function sendheartbeat(){
    invoke("send_heartbeat").then((res) => {
        console.log(res)
    }).catch((err) => {
        console.log(err)
    });
  }

  function getzones(){
    invoke("get_zones").then((res) => {
        console.log(res)
    }).catch((err) => {
        console.log(err)
    });
  }


  

  return (
    <div>
      <button onClick={getzones}>Send Heartbeat</button>
    </div>
      
  )
}

export default App
