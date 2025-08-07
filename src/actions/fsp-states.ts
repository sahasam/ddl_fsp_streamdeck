import { action, KeyDownEvent, SingletonAction, WillAppearEvent, streamDeck } from "@elgato/streamdeck";
import { createCanvas } from 'canvas';


const fspActionInstances = new Set<any>();


const STATES = ["Q", "T", "xx", "P0", "P1", "B0", "B1", 
  "R0", "R1", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"];

const STATE_COLORS = {
  // Core states
  "Q": [240, 240, 240],    // Light gray - Quiescent (most common)
  "T": [255, 255, 0],      // BRIGHT YELLOW - FIRING! 🔥
  
  // General states  
  "P0": [255, 0, 0],       // Red - General initial
  "P1": [255, 100, 100],   // Light red - General secondary
  
  // Border states
  "B0": [0, 0, 255],       // Blue - Border primary
  "B1": [100, 100, 255],   // Light blue - Border secondary
  
  // Ready states
  "R0": [128, 0, 128],     // Purple - Ready primary  
  "R1": [200, 100, 200],   // Light purple - Ready secondary
  
  // Action states (green family for progression)
  "A0": [0, 255, 0],       // Bright green
  "A1": [50, 255, 50],     // Light green
  "A2": [0, 200, 0],       // Medium green  
  "A3": [100, 255, 100],   // Pale green
  "A4": [0, 150, 0],       // Dark green
  "A5": [150, 255, 150],   // Very pale green
  "A6": [0, 255, 150],     // Green-cyan
  "A7": [150, 255, 0],     // Yellow-green
  
  "xx": [0, 0, 0]
};

const getStateRobot = (state: string): string => {
  switch (state) {
    // Core states
    case 'Q': return '🤖💤'; // Sleeping robot - Quiescent
    case 'T': return '🤖💥'; // FIRING! 
    case 'xx': return '🚫🤖'; // Invalid/Edge
    
    // General states
    case 'P0': return '👑🤖'; // General with crown
    case 'P1': return '🤖⚡'; // General powering up
    
    // Border states  
    case 'B0': return '🛡️🤖'; // Robot with shield
    case 'B1': return '🤖🔵'; // Border robot
    
    // Ready states
    case 'R0': return '🤖💪'; // Robot flexing - getting ready
    case 'R1': return '🤖🎯'; // Robot targeting
    
    // Action states - progressive dance moves!
    case 'A0': return '🤖🕺'; // Robot starts dancing
    case 'A1': return '💃🤖'; // Robot spinning
    case 'A2': return '🤖🎵'; // Robot with music
    case 'A3': return '🎶🤖'; // Robot vibing
    case 'A4': return '🤖✨'; // Robot with sparkles
    case 'A5': return '⚡🤖'; // Robot energizing
    case 'A6': return '🤖🌟'; // Robot with stars
    case 'A7': return '🔥🤖'; // Robot almost ready to fire
    
    default: return '🤖❓'; // Unknown state
  }
};

let globalFSPState = "xx";


const getColorBlock = (color:any) => {
  const r = color[0];
  const g = color[1];
  const b = color[2];
  
  // Create canvas
  const canvas = createCanvas(144, 144);
  const ctx = canvas.getContext('2d');
  
  // Fill with random color
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 144, 144);
  
  // Convert to base64 data URL
  const dataURL = canvas.toDataURL('image/png');
  
  return dataURL;
}

export const updateFSPState = async (state :string) => {
  // Update all tracked action instances
  if(globalFSPState == state) {
    return;
  }
  const color = STATE_COLORS[state as keyof typeof STATE_COLORS] ?? [0, 0, 0];
  const dataURL = getColorBlock(color);
  globalFSPState = state;

  for (const actionInstance of fspActionInstances) {
    try {
      await actionInstance.setTitle(`${getStateRobot(globalFSPState)}`);
      await actionInstance.setImage(dataURL)
    } catch (error) {
      // Remove invalid instances
      fspActionInstances.delete(actionInstance);
    }
  }
}

/**
 * An example action class that displays a count that increments by one each time the button is pressed.
 */
@action({ UUID: "com.sahas-munamala.fsp-frontend.fsp-states" })
export class FSPAction extends SingletonAction<CounterSettings> {
  /**
   * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
   * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
   * we're setting the title to the "count" that is incremented in {@link IncrementCounter.onKeyDown}.
   */
  override onWillAppear(ev: WillAppearEvent<CounterSettings>): void | Promise<void> {
    fspActionInstances.add(ev.action);
    ev.action.setImage(getColorBlock(STATE_COLORS[globalFSPState as keyof typeof STATE_COLORS]))
    // return ev.action.setTitle(`${getStateRobot(globalFSPState)}`);
    // ev.action.setImage("imgs/actions/soldier/robot_resized_72x72.jpg")
  }

  override onWillDisappear(ev: any): void | Promise<void> {
    // Remove this action instance from tracking
    fspActionInstances.delete(ev.action);
  }

  /**
   * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
   * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
   * and action information where applicable. In this example, our action will display a counter that increments by one each press. We track the current count on the action's persisted
   * settings using `setSettings` and `getSettings`.
   */
  override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
    await updateFSPState(STATES[Math.floor(Math.random()*STATES.length)]);
    // ev.action.setImage("imgs/actions/soldier/robot_resized_72x72.jpg")
  }
}

/**
 * Settings for {@link IncrementCounter}.
 */
type CounterSettings = {
  fspState?: number;
};
