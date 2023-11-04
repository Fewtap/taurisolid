
import './App.css'
import {invoke} from "@tauri-apps/api";
import {listen, emit} from "@tauri-apps/api/event";
import {IRoom, IZone} from "./interfaces.ts";
import { createSignal, createEffect, For } from 'solid-js';
import './card.css'
import { text } from 'stream/consumers';


function App() {

  const [zones, setZones] = createSignal<IZone[]>([])
  const [rooms , setRooms] = createSignal<IRoom[]>([])
  const [secondaryMenu, setSecondaryMenu] = createSignal<boolean>(false)
  const [temperature, setTemperature] = createSignal<number>(22)
  const [allRooms, setAllRooms] = createSignal<boolean>(true)

    listen("heartbeat", (event) => {
        console.log(event.payload)
    })

    

    listen("zones", (event) => {
      console.log("Zones: ", event.payload)
      
      setZones(event.payload as IZone[])
    }).then(() => {
      emit("ready").then((res) => {
        console.log("Response: ", res)
      }).catch((err) => {
        console.log(err)
      });
    }).catch((err) => {
      console.log(err)
    });

    listen("zone", (event) => {
      console.log("Zone: ", event.payload)
      let zone: IZone = event.payload as IZone;
      //replace zone in zones
      let oldzones = zones();

      let index = oldzones.findIndex((z) => z.zone_id == zone.zone_id)
      let newzones = [...oldzones]
      newzones[index] = zone;
      setZones(newzones)
    });

  setInterval(sendheartbeat, 14000)


  function sendheartbeat(){
    invoke("send_heartbeat").then((res) => {
        console.log(res)
    }).catch((err) => {
        console.log(err)
    });
  }

  function CollectRooms(e:Event){
    let textinput = e.target as HTMLTextAreaElement;
    if(!textinput.value.startsWith('Rom #') && !textinput.value.startsWith('Rum #')){
      setRooms([])
      console.log('Not a room log')
      return;
    }

    

    let lines = textinput.value.split('\n')
    if (lines.length <= 1) return

    lines = lines.slice(1);
    
    const temprooms: IRoom[] = []

    lines.forEach((line: string) => {
      const parts = line.split('\t');
      const roomnumber = parts[0].trim();
      //check if the first element in parts is a 3 digit number
      if(roomnumber.match(/\d{3}/) && zones().find((zone) => zone.name.includes(roomnumber))){
        const room: IRoom = {
          room_number: roomnumber,
          varmekabel: zones().find((zone) => zone.name.toLowerCase().includes("varmekabel") && zone.name.includes(roomnumber)) as IZone,
          varmeovn: zones().find((zone) => zone.name.toLowerCase().includes("varmeovn") && zone.name.includes(roomnumber)) as IZone
        }
        console.log(room)

        if(!rooms().includes(room)){
          console.log(`Room ${room.room_number} added`)
          temprooms.push(room)
        }

        
      }
    });

    setRooms(temprooms)

    
  }

  


  

  return (
    <div class="container">
      <div class='header'>
        <div class="controls">
          <button class={`menuButton ${!secondaryMenu() ? 'selected' : ''}`} onclick={() => {
            if(secondaryMenu()){
              setSecondaryMenu(false)
            }
            else{
              return;
            }
          }}>Rom</button>
          <button class={`menuButton ${secondaryMenu() ? 'selected' : ''}`} onclick={() => {
            if(!secondaryMenu()){
              setSecondaryMenu(true)
            }
            else{
              return;
            }
          }}>Zoner</button>
          <button class='menuButton'>Arrivals</button>
          <button class='menuButton'>Departures</button>
          </div>
          
          <div class="title">
          <h4>Markos ultimata temperatur grejsimojs</h4>
        </div>
        <div class="right">
          <div style={{
            "font-size": "1.5rem",
            "gap" : "1rem",
            display: 'flex',
          }}>
            <label>Temperature: </label>
            <input type="number" value={temperature()} onchange={(e) => {
              setTemperature(parseInt((e.target as HTMLInputElement).value))
            }} name="temperature" id="tempInput" />
            </div>
          <div style={{
            display: 'flex',
          }}class="allroomsdiv">
            <label for="allroomsinput">Alle rom</label>
            <input type="checkbox" checked={allRooms()} onchange={() => setAllRooms(!allRooms())} name="allrooms" id="allroomsinput" />
          </div>
          </div>
        
          
      
        
      </div>
      {secondaryMenu() ? <SecondaryMenu zones={zones()}/> : <MainMenu rooms={rooms()} textchangevent={CollectRooms}/>}
    </div>
    
      
  )
}

function RoomCard(props: {room: IRoom}) {

  return (
    <div class="card room">
      <h1>{props.room.room_number}</h1>
      <h2>Varmekabel: {props.room.varmekabel.temp_comfort_c}</h2>
      <h2>Varmeovn: {props.room.varmeovn.temp_comfort_c}</h2>
    </div>
  )
}

function ZoneCard(props: {zone: IZone}) {
  return (
    <div class="card">
      <h1>{props.zone.name}</h1>
      <h2>Temperature: {props.zone.temp_comfort_c}</h2>
    </div>
  )
}

function MainMenu(props: {rooms: IRoom[], textchangevent: (e: Event) => void}) {
  return (
    <div class="menu mainMenu">
      <h1>Rom</h1>
      <div class='doublecontainer'>
        <textarea class='roominput' onchange={(e) => props.textchangevent(e)}placeholder='Paste room text here'></textarea>
        <div class='grid rooms'>
          <For each={props.rooms}>
            {(room) => (
              <RoomCard room={room}/>
            )}
          </For>
          </div>
      </div>
    </div>
  )
}

function SecondaryMenu(props: {zones: IZone[]}) {
  return (
    
    <div class="menu secondaryMenu">
      <h1>Zoner</h1>
      <div class="grid">
        <For each={props.zones}>
          {(zone) => (
            <ZoneCard zone={zone}/>
          )}
        </For>
      </div>
    </div>
  )
}

export default App
