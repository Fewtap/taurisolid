
import './App.css'
import {invoke} from "@tauri-apps/api";
import {listen, emit} from "@tauri-apps/api/event";
import {IRoom, IZone, ILoadingObject} from "./interfaces.ts";
import { createSignal, createEffect, For, createMemo, untrack } from 'solid-js';
import './card.css'
import toast, { Toaster } from 'solid-toast';
import { appWindow } from '@tauri-apps/api/window';






function App() {



  
  document?.getElementById('min-btn')?.addEventListener('click', () => appWindow.minimize())
document?.getElementById('max-btn')?.addEventListener('click', () => appWindow.toggleMaximize())
document?.getElementById('close-btn')?.addEventListener('click', () => appWindow.close())

  const [zones, setZones] = createSignal<IZone[]>([])
  const [rooms , setRooms] = createSignal<IRoom[]>([])
  const [secondaryMenu, setSecondaryMenu] = createSignal<boolean>(false)
  const [varmeovnTemp, setVarmeovnTemp] = createSignal<number>(18)
  const [varmekabelTemp, setVarmeKabelTemp] = createSignal<number>(22)
  const [allElements, setAllElements] = createSignal<boolean>(true)
  const [selectedRooms, setSelectedRooms] = createSignal<IRoom[]>([])
  const [selectedZones, setSelectedZones] = createSignal<IZone[]>([])
  const [roomInputValue, setRoomInputValue] = createSignal<string>('')
  const [buttonsEnabled, setButtonsEnabled] = createSignal<boolean>(false)
  const [loadingObjects, setLoadingObjects] = createSignal<ILoadingObject[]>([])

  let roomMemo = createMemo(() => rooms())
  let zoneMemo = createMemo(() => zones())
  
 
  

    

    createEffect(() => {

     
      if(secondaryMenu()){
        setSelectedRooms([])
        setAllElements(false)
      }
      else{
        setSelectedZones([])
        setAllElements(true)
      }
    });

    createEffect(() => {
      
      

      if(secondaryMenu()){
        setButtonsEnabled(true)
      }
      else if(allElements() && !secondaryMenu() && rooms().length > 0){
        setButtonsEnabled(true)
      }
      else if(!allElements() && !secondaryMenu() && selectedRooms().length > 0){
        setButtonsEnabled(true)
      }
      else{
        setButtonsEnabled(false)
      }
    })


    createEffect(() => {
      //If statement to use it as a dependency
      if(zones().length > 0){
        untrack(() => {
          CollectRooms(null)
        })
      }
      
    })

   


    

    

    

    listen("zones", (event) => {
      
      const tempzones = event.payload as IZone[]
      //sort zones by id
      tempzones.sort((a, b) => +a.zone_id - +b.zone_id)
      setZones(event.payload as IZone[])
    }).then(() => {
      emit("ready").then(() => {
        
      }).catch((err) => {
        console.log(err)
      });
    }).catch((err) => {
      console.log(err)
    });

    createEffect(() => {
      console.log("Loading objects length: ",loadingObjects().length)
    });

    listen("zone", (event) => {
      //console.log("Zone: ", event.payload)
      let zone: IZone = event.payload as IZone;
      //replace zone in zones
      let oldzones = zones();

      let index = oldzones.findIndex((z) => z.zone_id == zone.zone_id)
      let newzones = [...oldzones]
      newzones[index] = zone;
      setSelectedZones([])
      setZones(newzones)
      
      
      const loadingobject = loadingObjects().find((obj) => obj.zone_id == zone.zone_id)
      

      if(loadingobject != undefined){
        toast.success(`Successfully updated ${zone.name}`, {
          id: loadingobject.loadingID,
          unmountDelay: 1000,
          
        });
        const newloadingobjects = loadingObjects().filter((obj) => obj != loadingobject)
        setLoadingObjects(newloadingobjects)
        
      }
      else{
        toast(`Zone ${zone.name} updated from another source`)
      }

      
    });

  setInterval(sendheartbeat, 14000)

    function handleSelect(room: IRoom | null = null, zone: IZone | null = null){
      
      if(room == null && zone == null) return;
      
      console.log({
        room: room,
        zone: zone
      })

      if(room != null && zone == null){
  
        
      if(selectedRooms().includes(room as IRoom)){
        //remove room from selectedRooms
        let newrooms = selectedRooms().filter((r) => r != room)
        setSelectedRooms(newrooms)
      }
      else{
        //add room to selectedRooms
        setSelectedRooms([...selectedRooms(), room as IRoom])
      }
    }
    else if(room == null && zone != null){
      
      if(selectedZones().includes(zone as IZone)){
        //remove room from selectedRooms
        let newzones = selectedZones().filter((z) => z != zone)
        setSelectedZones(newzones)
      }
      else{
        //add room to selectedRooms
        setSelectedZones([...selectedZones(), zone as IZone])
      }

    }
  }

  function UpdateZones(arrivals: boolean){
    let zonesToUpdate: IZone[] = []

    if(!secondaryMenu()){
      //Update rooms
      if(allElements()){

      
        const varmeovn: IZone[] = rooms().map((room) => room.varmeovn)
        
        const varmekabel: IZone[] = rooms().map((room) => room.varmekabel)
        
        //This array will be sent to the backend
        zonesToUpdate = [...varmeovn, ...varmekabel]
      

      //Send the command to the backend with the selected zones
    }
    else{
      if(selectedRooms().length == 0) return;
      //Collecting each individual zone
      const varmeovn: IZone[] = selectedRooms().map((room) => room.varmeovn)
      const varmekabel: IZone[] = selectedRooms().map((room) => room.varmekabel)
      //This array will be sent to the backend
      zonesToUpdate = [...varmeovn, ...varmekabel]
    }
    }
    else{
      //Update zones
      if(allElements()){
        zonesToUpdate = zones()
      }
      else{
        if(selectedZones().length == 0) return;
        zonesToUpdate = selectedZones()
      }
    }

    if(!secondaryMenu()){
//set the temperature
      for (let i = 0; i < zonesToUpdate.length; i++) {
            
        if(zonesToUpdate[i].name.toLowerCase().includes("varmekabel")){
          zonesToUpdate[i].temp_comfort_c = String(varmekabelTemp())
          zonesToUpdate[i].temp_eco_c = String(varmekabelTemp())
        }
        else if(zonesToUpdate[i].name.toLowerCase().includes("varmeovn")){
          zonesToUpdate[i].temp_comfort_c = String(varmeovnTemp())
          zonesToUpdate[i].temp_eco_c = String(varmeovnTemp())
        }
      }
    }
    else{
      //set the temperature
      for (let i = 0; i < zonesToUpdate.length; i++) {
            
        zonesToUpdate[i].temp_comfort_c = String(varmekabelTemp())
        zonesToUpdate[i].temp_eco_c = String(varmekabelTemp())
        
      }
    }

    zonesToUpdate.sort((a, b) => +a.zone_id - +b.zone_id)
    
    zonesToUpdate.forEach((zone) => {
      const id = toast.loading(`Updating ${zone.name}`,{
        style:{
          width: '15vw',
          "max-width": '15vw',
          "min-width": '15vw'
        }
      });
      const loadingobject: ILoadingObject = {
        loadingID: id,
        zone_id: zone.zone_id
      }

      setLoadingObjects([...loadingObjects(), loadingobject])
    })


      
    invoke("update_zones", {
      zonesInput: zonesToUpdate,
      departure: !arrivals,
    }).then(() => {
      
    }).catch((err) => {
      console.log(err)
    }
    )
  }




  function sendheartbeat(){
    invoke("send_heartbeat").then(() => {
        
    }).catch((err) => {
        console.log(err)
    });
  }

  function CollectRooms(e: null | Event){
    
    if(e != null){
      setRoomInputValue((e.target as HTMLTextAreaElement).value)
    }


    console.info('Collecting rooms')
    
    let textinput = roomInputValue()
    
    
    if(!textinput.startsWith('Rom #') && !textinput.startsWith('Rum #')){
      
      setRooms([])
    
      return;
    }
    

    

    let lines = textinput.split('\n')
    if (lines.length <= 1) return

    lines = lines.slice(1);
    
    const temprooms: IRoom[] = []

    lines.forEach((line: string) => {
      const parts = line.split('\t');
      const roomnumber = parts[0].trim();
      //check if the first element in parts is a 3 digit number
      if(roomnumber.match(/\d{3}/) && zoneMemo().find((zone) => zone.name.includes(roomnumber)) && roomnumber != "315"){
        const room: IRoom = {
          room_number: roomnumber,
          varmekabel: zoneMemo().find((zone) => zone.name.toLowerCase().includes("varmekabel") && zone.name.includes(roomnumber)) as IZone,
          varmeovn: zoneMemo().find((zone) => zone.name.toLowerCase().includes("varmeovn") && zone.name.includes(roomnumber)) as IZone
        }
        

        if(!roomMemo().includes(room)){
          
          temprooms.push(room)
        }

        
      }
    });
    setSelectedRooms([])
    setRooms(temprooms)
   

    
  }

  


  

  return (
    
    <div class="container">
      <div style={{
        position: 'absolute',
        top: '0',
        right: '0',
        display: 'flex',
        "flex-direction": 'column',
        "gap": '1rem',
      }}>
        <Toaster/>
        </div>
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
          <button class='menuButton' onclick={() => {
            
            if(!buttonsEnabled()){
              alert("There are no rooms to update??")
              return;
            }
            if(secondaryMenu() && allElements()){
              //add an accept or cancel alert
              let answer= confirm("Are you sure you want to update all zones?")
              if(!answer){
                return
              }
            }
            UpdateZones(true)}}>Arrivals</button>
          <button class='menuButton' onclick={() => {
           
            if(!buttonsEnabled()){
              alert("There are no rooms to update??")
              return;
            }
            if(secondaryMenu() && allElements()){
              //add an accept or cancel alert
              let answer= confirm("Are you sure you want to update all zones?")
              if(!answer){
                return
              }
            }
            UpdateZones(false)}}>Departures</button>
          </div>
          
          <div class="title">
          <h4>Live Laugh Love ~ Sun Tzu, Art of War 🙏</h4>
        </div>
        <div class="right">
          <div style={{
            "font-size": "1.5rem",
            "gap" : "1rem",
            display: 'flex',
          }}>
            <label>{secondaryMenu() ? "Temperature": "Varmekabel: "} </label>
            <input type="number" value={varmekabelTemp()} onchange={(e) => {
              setVarmeKabelTemp(parseInt((e.target as HTMLInputElement).value))
            }} name="temperature" id="tempInput" />
            </div>
            {secondaryMenu() ? null : 
            <div style={{
            "font-size": "1.5rem",
            "gap" : "1rem",
            display: 'flex',
          }}>
            <label>Varmeovn: </label>
            <input type="number" value={varmeovnTemp()} onchange={(e) => {
              setVarmeovnTemp(parseInt((e.target as HTMLInputElement).value))
            }} name="temperature" id="tempInput" />
            </div>}
            
          <div style={{
            display: 'flex',
          }}class="allroomsdiv">
            <label for="allroomsinput">Alle</label>
            <input type="checkbox" checked={allElements()} onchange={() => setAllElements(!allElements())} name="allrooms" id="allroomsinput" />
          </div>
          </div>
        
          
      
        
      </div>
      {!secondaryMenu() ? 
      //Main Menu
      <div class="menu mainMenu">
      <h1>Rom</h1>
      <div class='doublecontainer'>
        <textarea class='roominput' value={roomInputValue()} oninput={(e) => CollectRooms(e)} placeholder='Paste room text here'></textarea>
        <div class='grid rooms'>
          <For each={rooms()}>
            {(room) => (
              <RoomCard room={room} selectable={!allElements()} selected={selectedRooms().includes(room) ? true : false } selectFunction={() => 
                 {
                 
                  handleSelect(room, null)
                 }
                
              }/>
            )}
          </For>
          </div>
      </div>
    </div> : 
    //Zone Menu
    <div class="menu secondaryMenu">
      <h1>Zoner</h1>
      <div class="grid">
        <For each={zones()}>
          {(zone) => (
            <ZoneCard zone={zone} selectable={!allElements()} selected={selectedZones().includes(zone)} selectFunction={() => 
              {
                
                handleSelect(null, zone)
              }
            }/>
            
          )}
        </For>
      </div>
    </div>}
    </div>
    
    
      
  )
}

function RoomCard(props: {room: IRoom, selected: boolean, selectable: boolean ,selectFunction: () => void}) {
  return (
    <div class={`card room ${props.selected ? 'selected' : ''} ${props.selectable ? 'selectable' : ''} `} onclick={
      () => 
      {
        if(!props.selectable) return;
        props.selectFunction()
      }
      
      }>
      <h1>{props.room.room_number}</h1>
      <div class="tempdisplaycontainer">
        <h2>Varmekabel Temperature: </h2>
        <h2 class='temperaturetext'>{props.room.varmekabel && props.room.varmekabel.temp_comfort_c ? props.room.varmekabel.temp_comfort_c : "No temperature found"}</h2>
      </div>
      <div class="tempdisplaycontainer">
        <h2>Varmeovn Temperature: </h2>
        <h2 class='temperaturetext'>{props.room.varmeovn && props.room.varmeovn.temp_comfort_c ? props.room.varmeovn.temp_comfort_c : "No temperature found"}</h2>
      </div>
    </div>
  )
}

function ZoneCard(props: {zone: IZone, selectable: boolean, selected: boolean ,selectFunction: () => void}) {
  return (
    <div class={`card ${props.selected ? 'selected' : ''} ${props.selectable ? 'selectable' : ''}`} onclick={
      () => 
      {
        if(!props.selectable) return;
        props.selectFunction()
      }
      
      }>
      <h1>{props.zone.name}</h1>
      <div class="tempdisplaycontainer">
        <h2>Temperature: </h2>
        <h2 class='temperaturetext'>{props.zone.temp_comfort_c}</h2>
        
      </div>
      
    </div>
  )
}


    



export default App
