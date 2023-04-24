import { Polyline } from "./polyline.js"

export const Flaps = class extends Polyline {
	constructor() {
		super([
			[-6, 0],
			[0, 0],
			[0, -6],
		])

		this.transform.rotation = 45
		//this.style.fill = "none"
		//this.style.stroke = WHITE
		//this.style.strokeWidth = INNER_ATOM_UNIT
		//this.rectangle.dimensions.width = INNER_ATOM_UNIT
		//this.rectangle.dimensions.height = INNER_ATOM_UNIT
	}

	render() {
		this.use(() => {
			if (this.targets.length !== 3) return
			const [a, b, c] = this.targets
			if (this.style.stroke === "none") return
			if (this.style.strokeWidth === 0) return
			const extra = this.style.strokeWidth / 2
			this.style.strokeWidth
			const displacement = [-extra, -extra]

			const baseCorners = [
				[-6, 0],
				[0, 0],
				[0, -6],
			]

			let i = 0
			for (const target of this.targets) {
				const base = baseCorners[i]
				target.transform.position.x = base.x + displacement.x
				target.transform.position.y = base.y + displacement.y
				i++
			}
		})
		return super.render()
	}
}