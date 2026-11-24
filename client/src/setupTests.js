// Create React App runs this before every test file.
// Jest's browser simulation (jsdom) lacks TextEncoder/TextDecoder, which jsPDF needs when it loads,
// so borrow Node's.
import { TextEncoder, TextDecoder } from "util";

Object.assign(globalThis, { TextEncoder, TextDecoder });
