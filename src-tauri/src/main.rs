use std::panic::panic_any;
use tauri::{Manager, Window};
use tokio::net::TcpStream;
use chrono;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use std::io::{Read, Write};
use std::sync::Arc;
use tokio::sync::Mutex;
use once_cell::sync::OnceCell;

use tokio::net::tcp::{OwnedReadHalf, OwnedWriteHalf};


static GLOBAL_TCP_STREAM_READER: OnceCell<Arc<Mutex<OwnedReadHalf>>> = OnceCell::new();
static GLOBAL_TCP_STREAM_WRITER: OnceCell<Arc<Mutex<OwnedWriteHalf>>> = OnceCell::new();

static zones: OnceCell<Vec<Zone>> = OnceCell::new();

const IP: &str = "192.168.50.167";
const PORT: &str = "27779";
const SERIAL: &str = "102000126010";

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
}

use std::vec;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
struct Zone {
    zone_id: String,
    name: String,
    week_profile_id: String,
    temp_comfort_c: String,
    temp_eco_c: String,
    override_allowed: String,
    deprecated_override_id: String,
}

#[derive(Clone)]
struct AppState {
    window: Arc<Mutex<tauri::Window>>,
}
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#[cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tokio::main]
async fn main() {
    // Initialize the TcpStream here.
    let mut tcp_stream = TcpStream::connect(format!("{}:{}", IP, PORT)).await.expect("Failed to connect to the server");
    let current_time_string = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();

    let payload = format!("HELLO 1.1 {} {}\r", SERIAL, current_time_string);

   tcp_stream.try_write(payload.as_bytes()).expect("Failed to write to the server");





    let mut buffer = [0; 1024];
    let mut line = String::new();


    loop {
        let mut bytes_read = tcp_stream.read( &mut buffer).await.expect("Failed to read from the server");
        line.push_str(std::str::from_utf8(&buffer[..bytes_read]).expect("Failed to convert bytes to string"));

        if line.contains("HELLO") {
            println!("Received: {}", line);
            break;
        }



    }






let (reader, writer) = tcp_stream.into_split();

    GLOBAL_TCP_STREAM_READER.set(Arc::new(Mutex::new(reader))).expect("Failed to set global tcp stream");
    GLOBAL_TCP_STREAM_WRITER.set(Arc::new(Mutex::new(writer))).expect("Failed to set global tcp stream");



    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();

            


            let window = Arc::new(Mutex::new(window)); // Wrap the window

            let window_clone = window.clone();
            let app_state = AppState { window: window_clone.clone() }; // Clone the window before the async move block

            tauri::async_runtime::spawn({
                let window = window.clone();
                async move {
                    let window_clone_for_closure = window_clone.clone();
                    let window_guard = window.lock().await;
                    window_guard.listen("ready", move |_event| {
                        println!("Received ready event");
                        
                        let window_clone = Arc::clone(&window_clone_for_closure);
                        tauri::async_runtime::spawn(async move {
                            while zones.get().unwrap().len() == 0 {
                                //wait for zones to be populated
                                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                            }
                            println!("Zones Length: {}", zones.get().unwrap().len());
                            // your code here
                            let window_guard = window_clone.lock().await;
                            if let Err(e) = window_guard.emit("zones", zones.get().unwrap()) {
                                println!("Error emitting event: {}", e);
                            }
                        });
                    });
                }
            });

            // Store the window in the application state
          

            // Add the AppState to the application's managed state
            app.manage(app_state.clone()); // Clone the AppState, which is now cloneable

            // Spawn the read_line task with a clone of the app_state
            tauri::async_runtime::spawn(async move {
                read_line(app_state).await;
            });
            get_zones();
            
            

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![send_heartbeat])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");



}




fn get_zones() {

   let mut stream = std::net::TcpStream::connect(format!("{}:{}", IP, PORT)).expect("Failed to connect to the server");
    let current_time_string = chrono::Local::now().format("%Y%m%d%H%M%S").to_string();

    let payload = format!("HELLO 1.1 {} {}\r", SERIAL, current_time_string);

    stream.write_all(payload.as_bytes()).expect("Failed to write to the server");

    let mut buffer = [0; 1024];
    let mut line = String::new();


        loop {
            let mut bytes_read = stream.read( &mut buffer).expect("Failed to read from the server");
            line.push_str(std::str::from_utf8(&buffer[..bytes_read]).expect("Failed to convert bytes to string"));

            if line.contains("HELLO") {
                println!("Received: {}", line);
                break;
            }



        }

        let mut tempzones: Vec<Zone> = Vec::new();

        let payload = "G00\r".as_bytes();
        stream.write(payload).expect("Failed to write to the server");

        let mut buffer = [0; 1024];
        let mut line = String::new();

        loop {
            line.clear();
            let mut bytes_read = stream.read( &mut buffer).expect("Failed to read from the server");
            line.push_str(std::str::from_utf8(&buffer[..bytes_read]).expect("Failed to convert bytes to string"));

            if line.trim().contains("H01") {
                let parts = line.trim().split(" ").collect::<Vec<&str>>();
                let zone = Zone {
                    zone_id: parts[1].to_string(),
                    name: parts[2].to_string(),
                    week_profile_id: parts[3].to_string(),
                    temp_comfort_c: parts[4].to_string(),
                    temp_eco_c: parts[5].to_string(),
                    override_allowed: parts[6].to_string(),
                    deprecated_override_id: parts[7].to_string(),
                };

                

                tempzones.push(zone);
            }

            if(line.trim().contains("H02")) {
                println!("Received: {}", line);
                break;
            }



        }

        //sort zones by zone_id
        tempzones.sort_by(|a, b| a.zone_id.parse::<i32>().unwrap().cmp(&b.zone_id.parse::<i32>().unwrap()));

    zones.set(tempzones).expect("Failed to set zones");

    

}


#[tauri::command]
async fn send_heartbeat() -> Result<String, String> {
    if let Some(tcp_stream) = GLOBAL_TCP_STREAM_WRITER.get() {
        let mut writer = tcp_stream.lock().await;  // this line has been changed
        let payload = "KEEPALIVE\r".as_bytes();
        writer.write(payload).await.map_err(|e| e.to_string())?;

        Ok("Hearbeat sent".to_string())
    } else {
        return Err("Stream is not available".to_string());
    }


}

#[tauri::command]
async fn update_zones(zonesInput: Vec<Zone>) -> Result<String,String>{
    if let Some(tcp_stream) = GLOBAL_TCP_STREAM_WRITER.get() {
        let mut writer = tcp_stream.lock().await;  // this line has been changed
        for zone in zonesInput {
            let payload = format!("U00 {} {} {} {} {} {}\r", zone.zone_id, zone.name, zone.week_profile_id, zone.temp_comfort_c, zone.temp_eco_c, zone.override_allowed);
            writer.write(payload.as_bytes()).await.map_err(|e| e.to_string())?;
        }
    } else {
        return Err("Stream is not available".to_string());
    }

    Ok("Zones updated".to_string())

        
}

#[tauri::command]

async fn read_line(app_state: AppState) {
    println!("Starting read_line");
    if let Some(tcp_stream) = GLOBAL_TCP_STREAM_READER.get() {
        let mut tcp_stream_guard = tcp_stream.lock().await;
        let mut buffer = [0; 1024]; // Define the buffer size as per your need

        loop {

            match tcp_stream_guard.read(&mut buffer).await {
                Ok(0) => {
                    // End of stream reached
                    println!("End of stream reached.");
                    break;
                }
                Ok(bytes_read) => {

                    let data = &buffer[..bytes_read];

                    // If you expect UTF-8 encoded data, you can convert it to a string
                    match String::from_utf8(data.to_vec()) {
                        Ok(line) => {
                            println!("Received: {}", line);

                            // You might want to process the line here, for example,
                            // sending it to the Tauri window or handling it according
                            // to the protocol you're implementing.

                            let window_guard = app_state.window.lock().await;
                            if line.trim().contains("OK") {
                                if let Err(e) = window_guard.emit("heartbeat", line.trim()) {
                                    println!("Error emitting event: {}", e);
                                }
                                
                            }
                            if line.trim().contains("V00") {
                                let parts = line.trim().split(" ").collect::<Vec<&str>>();
                                let zone = Zone {
                                    zone_id: parts[1].to_string(),
                                    name: parts[2].to_string(),
                                    week_profile_id: parts[3].to_string(),
                                    temp_comfort_c: parts[4].to_string(),
                                    temp_eco_c: parts[5].to_string(),
                                    override_allowed: parts[6].to_string(),
                                    deprecated_override_id: parts[7].to_string(),
                                };

                                println!("Received: {:?}", zone);

                                if let Err(e) = window_guard.emit("zone", zone) {
                                    println!("Error emitting event: {}", e);
                                }
                                
                            }
                        }
                        Err(e) => {
                            // Handle invalid UTF-8 data here
                            println!("Received invalid UTF-8 data: {}", e);
                        }
                    }
                }
                Err(e) => {
                    // An error occurred while trying to read from the stream
                    println!("Error reading from stream: {}", e);
                    // Decide how to handle the error, e.g., retry, wait, or shutdown
                    break;
                }
            }
        }
    } else {
        panic_any("Stream is not available");
    }
}
