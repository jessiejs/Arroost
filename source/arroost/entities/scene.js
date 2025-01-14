import { shared } from "../../main.js"
import { Entity } from "./entity.js"
import { Dom } from "../components/dom.js"
import {
	Habitat,
	WHITE,
	add,
	distanceBetween,
	equals,
	fireEvent,
	subtract,
	use,
} from "../../../libraries/habitat-import.js"
import { Dragging } from "../machines/input.js"
import { Input } from "../components/input.js"
import { Movement } from "../components/movement.js"
import { DummyCreation } from "./cells/dummy-creation.js"
import { Ghost } from "./ghost.js"
import { Counter } from "./counter.js"
import { replenishUnlocks } from "./unlock.js"

const ZOOM_FRICTION = 0.75

export class Scene extends Entity {
	width = this.use(innerWidth)
	height = this.use(innerHeight)

	bounds = this.use({
		left: 0,
		top: 0,
		right: innerWidth,
		bottom: innerHeight,
		center: [innerWidth / 2, innerHeight / 2],
		centerToCorner: distanceBetween(
			[innerWidth / 2, innerHeight / 2],
			[innerWidth, innerHeight],
		),
		centerToEdge: distanceBetween(
			[innerWidth / 2, innerHeight / 2],
			[innerWidth, innerHeight / 2],
		),
	})

	constructor() {
		super()
		shared.scene = this
		this.input = this.attach(new Input(this))
		this.dom = this.attach(new Dom({ id: "scene", type: "html", input: this.input }))
		this.movement = this.attach(new Movement({ transform: this.dom.transform }))
		this.movement.friction.set([0.9, 0.9])

		this.dom.transform.position.set([innerWidth / 2, innerHeight / 2])

		const hovering = this.input.state("hovering")
		hovering.pointerdown = this.onHoveringPointerDown.bind(this)

		const dragging = this.input.state("dragging")
		dragging.pointerdown = this.onDraggingPointerDown.bind(this)
		dragging.pointermove = this.onDraggingPointerMove.bind(this)
		dragging.pointerup = this.onDraggingPointerUp.bind(this)

		this.use(() => {
			const _dragging = dragging.active.get()

			if (!shared.stage.context.html) return
			if (_dragging) {
				shared.stage.context.html.style["cursor"] = "grabbing"
			} else {
				shared.stage.context.html.style["cursor"] = "default"
			}
		})

		this.use(() => {
			const [sx, sy] = this.dom.transform.position.get() ?? [0, 0]
			const [ssx, ssy] = this.dom.transform.scale.get() ?? [1, 1]

			const screenLeft = -sx / ssx
			const screenTop = -sy / ssy
			const screenRight = (this.width.get() - sx) / ssx
			const screenBottom = (this.height.get() - sy) / ssy
			const screenCenter = [
				screenLeft + (screenRight - screenLeft) / 2,
				screenTop + (screenBottom - screenTop) / 2,
			]

			const screenCenterToCorner = distanceBetween(screenCenter, [screenRight, screenBottom])
			const screenCenterToEdge = distanceBetween(screenCenter, [screenRight, screenCenter.x])

			this.bounds.set({
				left: screenLeft,
				top: screenTop,
				right: screenRight,
				bottom: screenBottom,
				center: screenCenter,
				centerToCorner: screenCenterToCorner,
				centerToEdge: screenCenterToEdge,
			})
		})

		const layer = (this.layer = {
			cell: new Dom({ id: "cell-layer", type: "html" }),
			ghost: new Dom({ id: "ghost-layer", type: "html" }),
		})

		this.dom.append(layer.cell)
		this.dom.append(layer.ghost)

		const ghost = new Ghost()
		layer.ghost.append(ghost.dom)

		const counter = new Counter()
		layer.ghost.append(counter.dom)

		requestAnimationFrame(() => replenishUnlocks())
	}

	start({ html }) {
		const container = this.dom.getContainer()
		html.append(container)
	}

	resize() {
		this.height.set(innerHeight)
		this.width.set(innerWidth)
	}

	onHoveringPointerDown(e) {
		return new Dragging()
	}

	onDraggingPointerDown(e) {
		this.movement.velocity.set([0, 0])
		const pointerPosition = shared.pointer.transform.position.get()
		const position = this.dom.transform.position.get()
		e.state.pointerStart = pointerPosition
		e.state.start = position
	}

	onDraggingPointerMove(e) {
		const pointerPosition = shared.pointer.transform.position.get()
		const pointerStart = e.state.pointerStart
		const start = e.state.start
		const newPosition = add(pointerPosition, subtract(start, pointerStart))
		this.dom.transform.setAbsolutePosition(newPosition)
	}

	onDraggingPointerUp(e) {
		const velocity = shared.pointer.velocity.get()
		this.movement.velocity.set(velocity)
	}

	tick() {
		fireEvent("tick")

		const velocity = this.movement.velocity.get()
		const pointerPosition = shared.pointer.transform.position.get()

		if (
			!equals(velocity, [0, 0]) &&
			pointerPosition.x !== undefined &&
			pointerPosition.y !== undefined
		) {
			fireEvent(
				"pointermove",
				{
					clientX: pointerPosition.x,
					clientY: pointerPosition.y,
					target: document.elementFromPoint(pointerPosition.x, pointerPosition.y),
					pointerId: -1,
				},
				PointerEvent,
			)
		}

		const zoomSpeed = this.zoomSpeed.get()
		this.zoomSpeed.set(zoomSpeed * ZOOM_FRICTION)
		if (zoomSpeed !== 0 && Math.abs(zoomSpeed) < 0.001) {
			this.zoomSpeed.set(0)
		} else {
			this.zoom(shared.zoomer.speed + zoomSpeed)
		}
	}

	zoomSpeed = this.use(0.0)
	zoom(speed) {
		const scale = this.dom.transform.scale.get()
		const oldZoom = scale.x
		const newZoom = oldZoom * (1 - speed)
		this.dom.transform.scale.set([newZoom, newZoom])

		const position = this.dom.transform.position.get()
		const pointerPosition = shared.pointer.transform.position.get()

		const pointerOffset = subtract(pointerPosition, position)
		const scaleRatio = newZoom / oldZoom
		const scaledPointerOffset = Habitat.scale(pointerOffset, scaleRatio)
		this.dom.transform.position.set(subtract(pointerPosition, scaledPointerOffset))
	}
}
