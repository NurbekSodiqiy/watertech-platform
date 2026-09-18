import { domMax } from "framer-motion";

// domMax, not domAnimation: the sidebar's active pill uses `layoutId` and
// toasts use `layout`, and both need the layout-projection feature that only
// domMax carries. Loaded lazily by MotionProvider so it stays out of the
// initial chunk.
export default domMax;
