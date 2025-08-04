import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { IncrementCounter } from "./actions/increment-counter";
import { FSPAction } from "./actions/fsp-states";
import { FSPGeneral } from "./actions/fsp-general";
import { connect } from "./utils/websocket-utils";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.INFO);

connect();

// Register the increment action.
streamDeck.actions.registerAction(new IncrementCounter());
streamDeck.actions.registerAction(new FSPAction());
streamDeck.actions.registerAction(new FSPGeneral());

// Finally, connect to the Stream Deck.
streamDeck.connect();
