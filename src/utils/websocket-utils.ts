import streamDeck from "@elgato/streamdeck";
import { WebSocket } from 'ws';
import { updateFSPState } from "../actions/fsp-states";

const wsServerURL: string = "ws://127.0.0.1:8765"
const CONNECTION_TIMEOUT: number = 5000; // 5 seconds
const RECONNECT_INTERVAL: number = 2000; // 2 seconds
const HEARTBEAT_INTERVAL: number = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT: number = 10000; // 10 seconds

let websocket: WebSocket | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
let connectionCheckInterval: NodeJS.Timeout | null = null;
let lastMessageReceivedTime: number = Date.now();
let isConnecting: boolean = false;
let getStatusPingInterval: NodeJS.Timeout | null = null;

export function connect() {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
        return;
    }
    
    isConnecting = true;
    streamDeck.logger.info('Attempting to connect...');
    
    // Clear existing intervals
    clearIntervals();
    
    websocket = new WebSocket(wsServerURL);
    
    websocket.onopen = function() {
        streamDeck.logger.info('Connected');
        isConnecting = false;
        updateFSPState("xx");
        
        // Clear reconnect interval since we're connected
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        
        // Start monitoring connection health
        startConnectionHealthCheck();
        lastMessageReceivedTime = Date.now();
    };
    
    websocket.onmessage = function(event) {
        lastMessageReceivedTime = Date.now();
        
        try {
            const jsonS = JSON.parse(event.data.toString());
            if (jsonS.type === "fsp_status_update") {
                processJsonData(jsonS);
            } else if (jsonS.type === "command_response") {
                streamDeck.logger.info('Command Response:', event.data);
            }
        } catch (error) {
            streamDeck.logger.error('Failed to parse message:', error);
        }
    };
    
    websocket.onclose = function(event) {
        streamDeck.logger.info(`Disconnected (code: ${event.code}), retrying...`);
        handleDisconnection();
    };
    
    websocket.onerror = function(error) {
        streamDeck.logger.info('WebSocket error, retrying...', error);
        handleDisconnection();
    };
}

function handleDisconnection() {
    isConnecting = false;
    websocket = null;
    
    // Clear connection health check
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
        connectionCheckInterval = null;
    }
    
    // Update UI to show disconnected state
    updateFSPState("xx");
    
    // Start reconnection process
    startReconnect();
}

function checkConnectionHealth() {
    const timeSinceLastMessage = Date.now() - lastMessageReceivedTime;
    
    if (timeSinceLastMessage > CONNECTION_TIMEOUT) {
        streamDeck.logger.info(`No message received for ${timeSinceLastMessage}ms, closing connection`);
        if (websocket) {
            websocket.close();
        }
    }
}

function startReconnect() {
    // Prevent multiple reconnect intervals
    if (reconnectInterval) {
        return;
    }
    
    streamDeck.logger.info("Starting reconnect interval");
    reconnectInterval = setInterval(() => {
        if (!isConnecting && (!websocket || websocket.readyState !== WebSocket.OPEN)) {
            connect();
        }
    }, RECONNECT_INTERVAL);
}

function startConnectionHealthCheck() {
    // Clear existing health check
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
    }
    
    connectionCheckInterval = setInterval(checkConnectionHealth, 1000); // Check every second
}

function clearIntervals() {
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }
    
    if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
        connectionCheckInterval = null;
    }
}

// Function to properly shutdown the connection
export function disconnect() {
    streamDeck.logger.info('Disconnecting...');
    
    clearIntervals();
    
    if (websocket) {
        websocket.close();
        websocket = null;
    }
    
    isConnecting = false;
    updateFSPState("xx");
}



export function websocketSend(data:string) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(data);
    } else {
        streamDeck.logger.error("Websocket not up!! Could not send -- " + data)
    }
}




interface NodeData {
  topology_established: boolean;
  fsp_active: boolean;
  current_state: string;
  time_step: number;
  max_time: number;
  role: string;
  position: number;
  is_general: boolean;
}

interface FSPJsonData {
  success: boolean;
  data: {
    [nodeName: string]: NodeData;
  };
}

// const processJsonData = async (jsonData: FSPJsonData) => {
//     const firstKey = Object.keys(jsonData.data)[0];
//     streamDeck.logger.info("first Key: ", firstKey)
//     await updateFSPState(jsonData.data[firstKey].current_state);
// }

// Add this function to handle the JSON data processing
function processJsonData(jsonData: any) {
    try {
        if (jsonData.data && typeof jsonData.data === 'object') {
            const firstKey = Object.keys(jsonData.data)[0];
            if (firstKey) {
                const currentState = jsonData.data[firstKey]?.current_state;
                if (currentState) {
                    updateFSPState(currentState);
                }
            }
        }
    } catch (error) {
        streamDeck.logger.error('Error processing JSON data:', error);
    }
}


