import { MoveEvent } from "cubing/bluetooth";
import {
  bufferToSpacedHex,
  reid3x3x3ToTwizzleBinary,
  spacedHexToBuffer,
  twizzleBinaryToReid3x3x3,
} from "cubing/protocol";
import { BinaryMoveEvent } from "../../api.twizzle.net/common/stream";

// Modifies the original object
export function mutateToBinary(moveEvent: MoveEvent): BinaryMoveEvent {
  moveEvent.timeStamp = Math.floor(moveEvent.timeStamp); // Further reduce size on the wire/disk
  const binaryMoveEvent = moveEvent as BinaryMoveEvent; // TODO: typesafer option
  binaryMoveEvent.binaryState = bufferToSpacedHex(reid3x3x3ToTwizzleBinary(
    moveEvent.state,
  ));
  delete moveEvent.state;
  return binaryMoveEvent;
}

// Modifies the original object
export function mutateToTransformation(
  binaryMoveEvent: BinaryMoveEvent,
): MoveEvent {
  const moveEvent = binaryMoveEvent as MoveEvent; // TODO: typesafer option
  moveEvent.state = twizzleBinaryToReid3x3x3(
    spacedHexToBuffer(binaryMoveEvent.binaryState),
  );
  delete binaryMoveEvent.binaryState;
  return binaryMoveEvent;
}
