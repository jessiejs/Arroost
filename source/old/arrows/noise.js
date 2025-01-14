import { GREY, RED, SILVER, clamp, glue, repeatArray } from "../../../libraries/habitat-import.js"
import { setCursor } from "../../arroost/input/cursor.js"
import { INNER_RATIO, INNER_UNIT, MARGIN_RATIO, MARGIN_UNIT } from "../../arroost/unit.js"
import { shared } from "../../main.js"
import { ClosedFlaps } from "../shapes/flaps.js"
import { Line } from "../shapes/line.js"
import { Dragging } from "../states.js"
import { Thing } from "../thing.js"

const DURATION_RATIO = 0.01

export const ArrowOfNoise = class extends Thing {
	duration = this.use(0)
	startingPoint = this.use(0)

	trimEnd = this.use(0)
	trimStart = this.use(0)

	line = new Line()
	//backLine = new Line()
	flaps = new ClosedFlaps()
	backFlaps = new ClosedFlaps()
	startFlaps = new ClosedFlaps()
	startBackFlaps = new ClosedFlaps()

	isRecording = this.use(() => {
		if (!this.parent) return false
		return this.parent.parent.isRecording
	})

	colour = this.use(() => {
		return RED
	})

	constructor() {
		super()
		glue(this)
		//this.add(this.backLine)
		this.add(this.line)
		this.add(this.flaps)
		this.flaps.add(this.backFlaps)
		this.add(this.startFlaps)
		this.startFlaps.add(this.startBackFlaps)
	}

	render() {
		//this.line.extra = INNER_ATOM_UNIT

		const { flaps } = this

		flaps.style.stroke = "none"
		flaps.style.strokeWidth = 0
		flaps.transform.rotation = -45

		this.backFlaps.style.stroke = "none"
		this.backFlaps.style.strokeWidth = 0
		this.backFlaps.transform.rotation = 0
		this.backFlaps.transform.scale = [1 - MARGIN_RATIO * 4, 1 - MARGIN_RATIO * 4]
		this.backFlaps.transform.position = repeatArray(
			[-Math.hypot(MARGIN_UNIT / 2, MARGIN_UNIT / 2)],
			2,
		)
		this.backFlaps.style.pointerEvents = "none"

		this.startFlaps.style.stroke = "none"
		this.startFlaps.strokeWidth = 0
		this.startFlaps.transform.rotation = 45 + 90 * 1

		this.startBackFlaps.style.stroke = "none"
		this.startBackFlaps.style.strokeWidth = 0
		this.startBackFlaps.transform.rotation = 0
		this.startBackFlaps.transform.scale = [1 - MARGIN_RATIO * 4, 1 - MARGIN_RATIO * 4]
		this.startBackFlaps.transform.position = repeatArray(
			[-Math.hypot(MARGIN_UNIT / 2, MARGIN_UNIT / 2)],
			2,
		)
		this.startBackFlaps.style.pointerEvents = "none"

		const flapOffset = (Math.hypot(6, 6) / 2) * INNER_RATIO - 0.1

		this.use(() => {
			this.transform.position.x =
				-INNER_UNIT / 2 -
				MARGIN_UNIT -
				this.startingPoint * DURATION_RATIO +
				this.trimStart * DURATION_RATIO
			this.line.target.transform.position.x =
				INNER_UNIT +
				MARGIN_UNIT * 2 +
				this.trimEnd * DURATION_RATIO -
				this.trimStart * DURATION_RATIO
			// this.backLine.target.transform.position.x =
			// 	this.duration * DURATION_RATIO + INNER_UNIT + MARGIN_UNIT * 2
		})

		this.use(() => {
			this.flaps.transform.position.x =
				INNER_UNIT +
				MARGIN_UNIT * 2 +
				flapOffset +
				this.trimEnd * DURATION_RATIO -
				this.trimStart * DURATION_RATIO
			this.startFlaps.transform.position.x = -flapOffset
		})

		this.use(() => {
			if (this.isRecording) {
				//this._input = this.input
				//this.input = this.parent.parent.input
			} else {
				//this.input = this._input
			}
		})

		this.use(() => {
			this.line.style.stroke = this.isRecording ? GREY : GREY
			flaps.style.fill = GREY
			this.backFlaps.style.fill = SILVER
			this.startFlaps.style.fill = GREY
			this.startBackFlaps.style.fill = SILVER
		})

		//this.backLine.style.stroke = GREY
		this.line.input = this.input

		this.flaps.onHoveringEnter = this.onEndHoveringEnter
		this.startFlaps.onHoveringEnter = this.onEndHoveringEnter
		this.flaps.onPointingPointerDown = this.onEndPointingPointerDown
		this.startFlaps.onPointingPointerDown = this.onEndPointingPointerDown
		this.flaps.onDraggingPointerMove = (event, state) => {
			return this.onEndDraggingPointerMove(event, state, "End")
		}
		this.startFlaps.onDraggingPointerMove = (event, state) => {
			return this.onEndDraggingPointerMove(event, state, "Start")
		}
		this.flaps.onDraggingEnter = (previous, state) => {
			return this.onEndDraggingEnter(previous, state, "End")
		}
		this.startFlaps.onDraggingEnter = (previous, state) => {
			return this.onEndDraggingEnter(previous, state, "Start")
		}
		this.flaps.onDraggingPointerUp = (event, state) => {
			return this.onEndDraggingPointerUp(event, state, "End")
		}
		this.startFlaps.onDraggingPointerUp = (event, state) => {
			return this.onEndDraggingPointerUp(event, state, "Start")
		}
	}

	onEndHoveringEnter() {
		setCursor("ew-resize")
	}

	onEndPointingPointerDown() {
		return Dragging
	}

	onEndDraggingEnter(previous, state, side) {
		state.trimStartingPoint = this["trim" + side]
		setCursor("ew-resize")
	}

	onEndDraggingPointerMove(event, state, side) {
		if (state.trimStartingPoint === undefined) return
		const currentPointerPosition = shared.pointer.position
		const movement = currentPointerPosition.x - state.pointerStartPosition.x
		const relativeMovement = this.transform.getRelative([movement, 0])
		const trim = state.trimStartingPoint + relativeMovement.x / DURATION_RATIO
		if (side === "Start") this.trimStart = clamp(trim, 0, this.startingPoint)
		if (side === "End") this.trimEnd = clamp(trim, this.startingPoint, this.duration)
	}

	onEndDraggingPointerUp(event, state, side) {
		const flaps = side === "Start" ? this.startFlaps : this.flaps
		flaps.movement.setAbsoluteVelocity([-shared.pointer.velocity.x, 0])
	}

	onHoveringEnter() {
		setCursor("move")
	}

	onDraggingEnter(previous, state) {
		state.startingStartingPoint = this.startingPoint
	}

	onDraggingPointerMove(event, state) {
		if (state.startingStartingPoint === undefined) return
		const currentPointerPosition = shared.pointer.position
		const movement = currentPointerPosition.x - state.pointerStartPosition.x
		const relativeMovement = this.transform.getRelative([movement, 0])
		const startingPoint = state.startingStartingPoint - relativeMovement.x / DURATION_RATIO
		this.startingPoint = clamp(startingPoint, this.trimStart, this.trimEnd)
	}

	onDraggingPointerUp(event, state) {
		this.movement.setAbsoluteVelocity([shared.pointer.velocity.x, 0])
	}

	onPointingPointerDown() {
		return Dragging
	}

	tick() {
		for (const thing of [this, this.flaps, this.startFlaps]) {
			thing.movement.velocity.x *= 0.9
			if (Math.abs(thing.movement.velocity.x) < 0.01) {
				thing.movement.velocity.x = 0
			}
		}

		if (this.movement.velocity.x !== 0) {
			const startingPoint = this.startingPoint - this.movement.velocity.x / DURATION_RATIO
			this.startingPoint = clamp(startingPoint, this.trimStart, this.trimEnd)
		}

		if (this.flaps.movement.velocity.x !== 0) {
			const trimEnd = this.trimEnd - this.flaps.movement.velocity.x / DURATION_RATIO
			this.trimEnd = clamp(trimEnd, this.startingPoint, this.duration)
		}

		if (this.startFlaps.movement.velocity.x !== 0) {
			const trimStart = this.trimStart - this.startFlaps.movement.velocity.x / DURATION_RATIO
			this.trimStart = clamp(trimStart, 0, this.startingPoint)
		}
	}
}
