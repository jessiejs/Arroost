import { objectEquals } from "../../libraries/utilities.js"
import { BEHAVIOURS } from "./behave.js"
import { OPERATIONS } from "./operate.js"
import { NoganSchema, PULSE_COLOURS } from "./schema.js"

const N = NoganSchema

/** @type {AsConst} */
export const c = (v) => v

/** @type {AsTuple} */
export const t = (v) => v

//============//
// Validating //
//============//
/** @type {boolean | undefined} */
const SHOULD_VALIDATE_OVERRIDE = false

/** @type {boolean | null} */
let _shouldValidate = null

/**
 * Should we validate?
 * @returns {boolean}
 */
export const shouldValidate = () => {
	if (SHOULD_VALIDATE_OVERRIDE !== undefined) return SHOULD_VALIDATE_OVERRIDE
	if (_shouldValidate !== null) return _shouldValidate
	_shouldValidate = !!(!window.shared || window.shared.debug.validate)
	return _shouldValidate
}

/**
 * Validate a value against a schema.
 * Only runs if we're in debug mode.
 * @param {any} value
 * @param {Schema} schema
 */
export const validate = (value, schema) => {
	if (!shouldValidate()) return

	try {
		schema.validate(value)
	} catch (error) {
		// console.log(value)
		// console.error(schema.diagnose(value))
		throw error
	}
}

/**
 * Reach unimplemented code.
 * @returns {never}
 */
export const unimplemented = () => {
	throw new Error("Unimplemented")
}

//=========//
// Memoise //
//=========//
/** @implements {Memo<any, any, any>} */
const Cache = class {
	static RESERVED = Symbol("reserved")
	static NEW = Symbol("new")
	entries = new DeepMap()

	encode(args) {
		return args
	}

	/** @param {any} key */
	query(key) {
		if (!this.entries.has(key)) {
			this.entries.set(key, Cache.RESERVED)
			return Cache.NEW
		}
		return this.entries.get(key)
	}

	/**
	 * @param {any} key
	 * @param {any} value
	 */
	store(key, value) {
		this.entries.set(key, value)
	}
}

class DeepMap extends Map {
	constructor() {
		super()
	}

	_has(key) {
		return super.has(key)
	}

	_get(key) {
		return super.get(key)
	}

	_set(key, value) {
		return super.set(key, value)
	}

	set(keys, value) {
		/** @type {DeepMap} */
		let map = this
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i]
			if (!map._has(key)) {
				const submap = new DeepMap()
				map._set(key, submap)
				map = submap
				continue
			}
			map = map._get(key)
		}

		const key = keys[keys.length - 1]
		map._set(key, value)
		return this
	}

	get(keys) {
		let map = this
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i]
			if (!map._has(key)) return undefined
			map = map._get(key)
		}

		const key = keys[keys.length - 1]
		return map._get(key)
	}

	has(keys) {
		let map = this
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i]
			if (!map._has(key)) return false
			map = map._get(key)
		}

		const key = keys[keys.length - 1]
		return map._has(key)
	}
}

//=======//
// Nogan //
//=======//
/**
 * Create a nogan.
 * @returns {Nogan}
 */
export const createNogan = () => {
	const nogan = N.Nogan.make()
	validate(nogan, N.Nogan)
	return nogan
}

/**
 * Get a JSON string of a nogan.
 * @param {Nogan} nogan
 * @returns {string}
 */
export const getJSON = (nogan) => {
	if (!nogan.json) {
		nogan.json = JSON.stringify(nogan)
	}
	validate(nogan, N.Nogan)
	return nogan.json
}

/**
 * Get a JSON string of an array of nogans.
 * @param {Nogan[]} nogans
 * @returns {string}
 */
export const getArrayJSON = (nogans) => {
	if (nogans.length === 0) return "[]"
	if (nogans.length === 1) return getJSON(nogans[0])
	return nogans.map(getJSON).join()
}

/**
 * Clear a nogan's cache.
 * @param {Nogan} nogan
 */
const clearCache = (nogan) => {
	nogan.json = null
}

/**
 * Get a clone of a nogan.
 * @param {Nogan} nogan
 * @returns {Nogan}
 */
export const getClone = (nogan) => {
	// Parsing was faster!
	const json = getJSON(nogan)
	return JSON.parse(json)

	// return structuredClone(nogan)
}

/**
 * Get the root cell.
 * @param {Nogan} nogan
 * @returns {Cell}
 */
export const getRoot = (nogan) => {
	const root = nogan.items[0]
	validate(root, N.Cell)
	// @ts-expect-error
	return root
}

/**
 * Checks if a cell is the root cell.
 * @param {CellId} id
 * @returns {boolean}
 */
export const isRoot = (id) => {
	return id === 0
}

//====//
// Id //
//====//
/**
 * Reserve a cell id.
 * @param {Nogan} nogan
 * @returns {CellId}
 */
export const reserveCellId = (nogan) => {
	if (nogan.deletedCells.length > 0) {
		const id = nogan.deletedCells.pop()
		clearCache(nogan)
		validate(nogan, N.Nogan)
		validate(id, N.CellId)
		// @ts-expect-error
		return id
	}

	const id = nogan.nextCell
	nogan.nextCell++
	nogan.items[id] = null
	clearCache(nogan)
	validate(nogan, N.Nogan)
	validate(id, N.CellId)
	return id
}

/**
 * Reserve a wire id.
 * @param {Nogan} nogan
 * @returns {WireId}
 */
export const reserveWireId = (nogan) => {
	if (nogan.deletedWires.length > 0) {
		const id = nogan.deletedWires.pop()
		clearCache(nogan)
		validate(nogan, N.Nogan)
		validate(id, N.WireId)
		// @ts-expect-error
		return id
	}

	const id = nogan.nextWire
	nogan.nextWire--
	nogan.items[id] = null
	clearCache(nogan)
	validate(nogan, N.Nogan)
	validate(id, N.WireId)
	return id
}

/**
 * Bin a cell id.
 * @param {Nogan} nogan
 * @param {{
 * 	id: CellId,
 * 	mode?: "delete" | "archive",
 * 	check?: boolean,
 * }} options
 */
export const binCellId = (nogan, { id, mode = "delete", check = true }) => {
	const bin = mode === "delete" ? nogan.deletedCells : nogan.archivedCells
	bin.push(id)
	nogan.items[id] = null
	clearCache(nogan)
	if (check) validate(nogan, N.Nogan)
}

/**
 * Delete a cell id.
 * @param {Nogan} nogan
 * @param {CellId} id
 * @param {{check?: boolean}} options
 */
export const deleteCellId = (nogan, id, { check = true } = {}) => {
	return binCellId(nogan, { id, mode: "delete", check })
}

/**
 * Archive a cell id.
 * @param {Nogan} nogan
 * @param {CellId} id
 * @param {{check?: boolean}} options
 */
export const archiveCellId = (nogan, id, { check = true } = {}) => {
	return binCellId(nogan, { id, mode: "archive", check })
}

/**
 * Bin a wire id.
 * @param {Nogan} nogan
 * @param {{
 * 	id: WireId,
 * 	mode?: "delete" | "archive",
 * 	check?: boolean,
 * }} options
 */
export const binWireId = (nogan, { id, mode = "delete", check = true }) => {
	const bin = mode === "delete" ? nogan.deletedWires : nogan.archivedWires
	bin.push(id)
	nogan.items[id] = null
	clearCache(nogan)
	if (check) validate(nogan, N.Nogan)
}

/**
 * Delete a wire id.
 * @param {Nogan} nogan
 * @param {WireId} id
 */
export const deleteWireId = (nogan, id) => {
	return binWireId(nogan, { id, mode: "delete" })
}

/**
 * Archive a wire id.
 * @param {Nogan} nogan
 * @param {WireId} id
 */
export const archiveWireId = (nogan, id) => {
	return binWireId(nogan, { id, mode: "archive" })
}

/**
 * Delete archived cell id.
 * @param {Nogan} nogan
 * @param {CellId} id
 */
export const deleteArchivedCellId = (nogan, id) => {
	const index = nogan.archivedCells.indexOf(id)
	nogan.archivedCells.splice(index, 1)
	nogan.deletedCells.push(id)
	clearCache(nogan)
	validate(nogan, N.Nogan)
}

/**
 * Delete archived wire id.
 * @param {Nogan} nogan
 * @param {WireId} id
 */
export const deleteArchivedWireId = (nogan, id) => {
	const index = nogan.archivedWires.indexOf(id)
	nogan.archivedWires.splice(index, 1)
	nogan.deletedWires.push(id)
	clearCache(nogan)
	validate(nogan, N.Nogan)
}

/**
 * Delete cell id archive.
 * @param {Nogan} nogan
 */
export const deleteArchivedCellIds = (nogan) => {
	nogan.deletedCells.push(...nogan.archivedCells)
	nogan.archivedCells = []
	clearCache(nogan)
	validate(nogan, N.Nogan)
}

/**
 * Delete wire id archive.
 * @param {Nogan} nogan
 */
export const deleteArchivedWireIds = (nogan) => {
	nogan.deletedWires.push(...nogan.archivedWires)
	nogan.archivedWires = []
	clearCache(nogan)
	validate(nogan, N.Nogan)
}

/**
 * Create a cell or a wire, depending on the id.
 * @template {Cell | Wire} Item
 * @param {Nogan} nogan
 * @param {Item extends Cell ? {
 *  id: CellId,
 * 	parent?: CellId,
 * 	type?: CellType,
 * 	position?: Vector2D
 * } : {
 *  id: WireId,
 * 	source: CellId,
 * 	target: CellId,
 * 	colour?: WireColour,
 * 	timing?: Timing,
 * }} options
 * @returns {Item}
 */
export const createItem = (nogan, options) => {
	const { id } = options
	if (id > 0) {
		// @ts-expect-error
		return createCell(nogan, options)
	}

	// @ts-expect-error
	return createWire(nogan, options)
}

//======//
// Cell //
//======//
/**
 * Create a cell.
 * @param {Nogan} nogan
 * @param {{
 * 	parent?: CellId,
 * 	type?: CellType,
 * 	position?: Vector2D
 * }} options
 * @returns {Cell}
 */
export const createCell = (nogan, { parent = 0, type = "dummy", position = [0, 0] } = {}) => {
	const id = reserveCellId(nogan)
	const cell = N.Cell.make({ id, type, position, parent })
	nogan.items[id] = cell

	const parentCell = getCell(nogan, parent)
	parentCell.cells.push(id)

	clearCache(nogan)
	validate(cell, N.Cell)
	validate(parentCell, N.Cell)
	validate(nogan, N.Nogan)
	return cell
}

/**
 * Get a cell.
 * @param {Nogan} nogan
 * @param {CellId} id
 * @param {{check?: boolean}} options
 * @returns {Cell}
 */
export const getCell = (nogan, id, { check = true } = {}) => {
	const cell = nogan.items[id]
	if (check) validate(cell, N.Cell)
	// @ts-expect-error
	return cell
}

/**
 * Iterate through all cells.
 * @param {Nogan} nogan
 * @return {Iterable<Cell>}
 */
export function* iterateCells(nogan) {
	for (let id = 0; id < nogan.nextCell; id++) {
		const cell = nogan.items[id]
		if (!cell) continue
		validate(cell, N.Cell)
		// @ts-expect-error
		yield cell
	}
}

/**
 * Iterate through all cell ids.
 * @param {Nogan} nogan
 * @return {Iterable<CellId>}
 */
export function* iterateCellIds(nogan) {
	for (let id = 0; id < nogan.nextCell; id++) {
		const cell = nogan.items[id]
		if (!cell) continue
		validate(cell, N.Cell)
		validate(id, N.CellId)
		yield id
	}
}

/**
 * Get all cells.
 * @param {Nogan} nogan
 * @returns {Cell[]}
 */
export const getCells = (nogan) => {
	return [...iterateCells(nogan)]
}

/**
 * Give a child to another cell.
 * @param {Nogan} nogan
 * @param {{
 * 	source?: CellId,
 * 	target: CellId,
 * 	child: CellId,
 * }} options
 */
export const giveChild = (nogan, { source = 0, target, child }) => {
	const sourceCell = getCell(nogan, source)
	const targetCell = getCell(nogan, target)
	const childCell = getCell(nogan, child)

	const sourceIndex = sourceCell.cells.indexOf(child)
	sourceCell.cells.splice(sourceIndex, 1)

	childCell.parent = target
	targetCell.cells.push(child)

	clearCache(nogan)
	validate(sourceCell, N.Cell)
	validate(targetCell, N.Cell)
	validate(childCell, N.Cell)
	validate(nogan, N.Nogan)
}

/**
 * Create a template from a cell.
 * @param {Partial<Cell>} cell
 * @returns {CellTemplate}
 */
export const getTemplate = ({ type = "dummy" } = {}) => {
	const template = N.CellTemplate.make({ type })
	validate(template, N.CellTemplate)
	return template
}

/**
 * Bin a cell.
 * @param {Nogan} nogan
 * @param {{
 * 	id: CellId,
 * 	mode?: "delete" | "archive",
 * 	check?: boolean,
 * }} options
 */
export const binCell = (nogan, { id, mode = "delete", check = true }) => {
	const cell = getCell(nogan, id, { check })
	const parentCell = getCell(nogan, cell.parent, { check })
	if (parentCell) {
		const index = parentCell.cells.indexOf(id)
		parentCell.cells.splice(index, 1)
	}

	binCellId(nogan, { mode, id: cell.id, check: false })

	for (const child of cell.cells) {
		binCell(nogan, { id: child, mode, check: false })
	}

	for (const input of cell.inputs) {
		binWire(nogan, { id: input, mode, check: false })
	}

	for (const output of cell.outputs) {
		binWire(nogan, { id: output, mode, check: false })
	}

	if (check) {
		validate(parentCell, N.Cell)
		validate(nogan, N.Nogan)
	}
}

/**
 * Delete a cell.
 * @param {Nogan} nogan
 * @param {CellId} id
 */
export const deleteCell = (nogan, id) => {
	return binCell(nogan, { id, mode: "delete" })
}

/**
 * Archive a cell.
 * @param {Nogan} nogan
 * @param {CellId} id
 */
export const archiveCell = (nogan, id) => {
	return binCell(nogan, { id, mode: "archive" })
}

/**
 * Modify a cell.
 * @param {Nogan} nogan
 * @param {{
 * 	id: CellId,
 * 	type?: CellType,
 *  tag?: { [key: string]: string }
 * 	position?: Vector2D,
 * 	propogate?: boolean,
 * 	past?: Nogan[],
 * 	future?: Nogan[],
 * 	filter?: (id: CellId) => boolean,
 * }} options
 * @returns {Operation[]}
 */
export const modifyCell = (
	nogan,
	{ id, type, tag, position, propogate = PROPOGATE_DEFAULT, past = [], future = [], filter },
) => {
	const cell = getCell(nogan, id)
	cell.type = type ?? cell.type
	cell.position = position ?? cell.position
	cell.tag = tag ?? cell.tag
	clearCache(nogan)

	if (propogate) {
		return refresh(nogan, { past, future, filter })
	}

	validate(cell, N.Cell)
	validate(nogan, N.Nogan)
	return []
}

//======//
// Wire //
//======//
/**
 * Create a wire.
 * @param {Nogan} nogan
 * @param {{
 * 	source: CellId,
 * 	target: CellId,
 * 	colour?: WireColour,
 * 	timing?: Timing,
 *  propogate?: boolean,
 * 	past?: Nogan[],
 * 	future?: Nogan[],
 * }} options
 * @returns {{ wire: Wire, operations: Operation[] }}
 */
export const createWire = (
	nogan,
	{
		source,
		target,
		colour = "any",
		timing = 0,
		propogate = PROPOGATE_DEFAULT,
		past = [],
		future = [],
	},
) => {
	const id = reserveWireId(nogan)
	const wire = N.Wire.make({ id, source, target, colour, timing })
	nogan.items[id] = wire

	const sourceCell = getCell(nogan, source)
	const targetCell = getCell(nogan, target)
	sourceCell.outputs.push(id)
	targetCell.inputs.push(id)
	clearCache(nogan)

	if (propogate) {
		const operations = refresh(nogan, { past, future })
		return { wire, operations }
	}

	validate(wire, N.Wire)
	validate(sourceCell, N.Cell)
	validate(targetCell, N.Cell)
	validate(nogan, N.Nogan)
	return { wire, operations: [] }
}

/**
 * Get a wire.
 * @param {Nogan} nogan
 * @param {WireId} id
 * @param {{check?: boolean}} options
 * @returns {Wire}
 */
export const getWire = (nogan, id, { check = true } = {}) => {
	const wire = nogan.items[id]
	if (check) validate(wire, N.Wire)
	// @ts-expect-error
	return wire
}

/**
 * Delete a wire.
 * @param {Nogan} nogan
 * @param {WireId} id
 */
export const deleteWire = (nogan, id) => {
	binWire(nogan, { id, mode: "delete" })
}

/**
 * Archive a wire.
 * @param {Nogan} nogan
 * @param {WireId} id
 */
export const archiveWire = (nogan, id) => {
	binWire(nogan, { id, mode: "archive" })
}

/**
 * Bin a wire.
 * @param {Nogan} nogan
 * @param {{
 * 	id: WireId,
 * 	mode?: "delete" | "archive",
 * 	check?: boolean,
 * }} options
 */
export const binWire = (nogan, { id, mode = "delete", check = true }) => {
	const wire = getWire(nogan, id, { check })

	const sourceCell = getCell(nogan, wire.source, { check })
	if (sourceCell) {
		const sourceIndex = sourceCell.outputs.indexOf(id)
		sourceCell.outputs.splice(sourceIndex, 1)
	}

	const targetCell = getCell(nogan, wire.target, { check })
	if (targetCell) {
		const targetIndex = targetCell.inputs.indexOf(id)
		targetCell.inputs.splice(targetIndex, 1)
	}

	binWireId(nogan, { mode, id: wire.id, check: false })

	if (check) {
		validate(sourceCell, N.Cell)
		validate(targetCell, N.Cell)
		validate(nogan, N.Nogan)
	}
}

/**
 * Iterate through all wires.
 * @param {Nogan} nogan
 * @return {Iterable<Wire>}
 */
export function* iterateWires(nogan) {
	for (let id = -1; id >= nogan.nextWire; id--) {
		const wire = nogan.items[id]
		if (!wire) continue
		validate(wire, N.Wire)
		// @ts-expect-error
		yield wire
	}
}

/**
 * Iterate through all wire ids.
 * @param {Nogan} nogan
 * @return {Iterable<WireId>}
 */
export function* iterateWireIds(nogan) {
	for (let id = -1; id >= nogan.nextWire; id--) {
		const wire = nogan.items[id]
		if (!wire) continue
		validate(wire, N.Wire)
		validate(id, N.WireId)
		yield id
	}
}

/**
 * Get all wires.
 * @param {Nogan} nogan
 * @returns {Wire[]}
 */
export const getWires = (nogan) => {
	return [...iterateWires(nogan)]
}

/**
 * Modify a wire.
 * @param {Nogan} nogan
 * @param {{
 * 	id: WireId,
 * 	colour?: WireColour,
 * 	timing?: Timing,
 * 	propogate?: boolean,
 * 	past?: Nogan[],
 * 	future?: Nogan[],
 * }} options
 * @returns {Operation[]}
 */
export const modifyWire = (
	nogan,
	{ id, colour, timing, propogate = PROPOGATE_DEFAULT, past = [], future = [] },
) => {
	const wire = getWire(nogan, id)
	wire.colour = colour ?? wire.colour
	wire.timing = timing ?? wire.timing
	clearCache(nogan)

	if (propogate) {
		return refresh(nogan, { past, future })
	}

	validate(wire, N.Wire)
	validate(nogan, N.Nogan)
	return []
}

//=======//
// Pulse //
//=======//
/**
 * Create a pulse.
 * @param {Pulse} options
 * @returns {Pulse}
 */
export const createPulse = (options = { type: "raw" }) => {
	const pulse = N.Pulse.make(options)
	validate(pulse, N.Pulse)
	return pulse
}

/**
 * Create a fire.
 * @param {{
 * 	red?: Pulse,
 * 	green?: Pulse,
 * 	blue?: Pulse,
 * }} options
 * @returns {Fire}
 */
export const createFire = ({ red, green, blue } = {}) => {
	const fire = N.Fire.make({ red, green, blue })
	validate(fire, N.Fire)
	return fire
}

/**
 * Fire a cell.
 * @param {Nogan} nogan
 * @param {{
 * 	id: CellId,
 * 	colour?: PulseColour,
 * 	pulse?: Pulse,
 * 	propogate?: boolean,
 * 	past?: Nogan[],
 * 	future?: Nogan[],
 * }} options
 * @returns {Operation[]}
 */
export const fireCell = (
	nogan,
	{
		id,
		colour = "blue",
		pulse = { type: "raw" },
		propogate = PROPOGATE_DEFAULT,
		past = [],
		future = [],
	},
) => {
	const cell = getCell(nogan, id)
	const { fire } = cell
	const current = fire[colour]
	if (objectEquals(current, pulse)) return []
	fire[colour] = pulse
	clearCache(nogan)

	const firedOperation = c({ type: "fired", id })

	if (propogate) {
		const refreshOperations = refresh(nogan, { past, future })
		refreshOperations.push(firedOperation)
		return refreshOperations
	}

	validate(cell, N.Cell)
	validate(nogan, N.Nogan)
	validate(pulse, N.Pulse)
	return [firedOperation]
}

//=========//
// Project //
//=========//
/**
 * Clone a nogan, ending all fires of cells whose parents are firing.
 * @param {Nogan} nogan
 * @returns {{
 * 	projection: Nogan,
 * 	operations: Operation[],
 * }}
 */
export const getProjection = (nogan) => {
	const projection = getClone(nogan)
	const operations = []

	for (const cell of iterateCells(projection)) {
		cell.tag = {}
		const { parent } = cell

		// No need to unfire if it's not firing
		if (!cell.fire.blue && !cell.fire.red && !cell.fire.green) continue

		// Don't unfire the cell if its parent isn't firing
		if (!isRoot(parent) && !isFiring(nogan, { id: parent })) continue

		cell.fire = createFire()
		const unfiredOperation = c({ type: "unfired", id: cell.id })
		operations.push(unfiredOperation)
	}

	validate(projection, N.Nogan)
	return { projection, operations }
}

//======//
// Peak //
//======//
/**
 * Create a peak.
 * @param {{
 * 	operations?: Operation[],
 * 	pulse?: Pulse | null,
 * 	final?: boolean,
 * }} options
 * @returns {Peak}
 */
export const createPeak = ({ operations = [], pulse, final = false } = {}) => {
	const peak = pulse
		? N.SuccessPeak.make({ operations, pulse, final })
		: N.FailPeak.make({ operations, final })
	validate(peak, N.Peak)
	return peak
}

/**
 * Flip a timing.
 * @param {Timing} timing
 * @returns {Timing}
 */
const getFlippedTiming = (timing) => {
	switch (timing) {
		case -1:
			return 1
		case 0:
			return 0
		case 1:
			return -1
	}
}

/**
 * @typedef {{
 *  nogan: Nogan,
 *  id: CellId,
 *  colour: PulseColour,
 *  timing: Timing,
 *  past: Nogan[],
 *  future: Nogan[],
 * }} GetPeakOptions
 */

/** @implements {Memo<Peak, string, GetPeakOptions>} */
const GetPeakMemo = class extends Cache {
	/** @param {GetPeakOptions} options */
	// @ts-expect-error
	encode({ nogan, id, colour, timing, past, future }) {
		return [getJSON(nogan), id, colour, timing, getArrayJSON(past), getArrayJSON(future)]
	}
}

/**
 * Peak at a cell to see how it's firing.
 * @param {Nogan} nogan
 * @param {{
 * 	id: CellId,
 * 	colour?: PulseColour,
 * 	timing?: Timing,
 * 	past?: Nogan[],
 * 	future?: Nogan[],
 *  memo?: GetPeakMemo,
 * }} options
 * @returns {Peak}
 */
export const getPeak = (
	nogan,
	{ id, colour = "blue", timing = 0, past = [], future = [], memo = new GetPeakMemo() },
) => {
	const key = memo.encode({ nogan, id, colour, timing, past, future })
	const cached = memo.query(key)
	if (cached === Cache.RESERVED) {
		// Infinite wire loop detected!
		return createPeak()
	} else if (cached !== Cache.NEW) {
		return cached
	}

	if (timing === 0) {
		const peak = getPeakNow(nogan, { id, colour, past, future, memo })
		memo.store(key, peak)
		return peak
	}

	const to = timing === 1 ? future : past
	const from = timing === 1 ? past : future

	// First, let's try to look in the known future/past
	const [next, ...rest] = to
	if (next) {
		const peak = getPeakNow(next, {
			id,
			colour,
			past: timing === 1 ? [nogan, ...past] : rest,
			future: timing === 1 ? rest : [nogan, ...future],
			memo,
		})
		memo.store(key, peak)
		return peak
	}

	// Otherwise, let's prepare to imagine the future/past
	const { projection } = getProjection(nogan)

	// But wait!
	// Are we stuck in a loop?
	if (objectEquals(from.at(0), nogan)) {
		return createPeak()
	}

	// If not, let's imagine the future/past!
	const peak = getPeakNow(projection, {
		id,
		colour,
		past: timing === 1 ? [nogan, ...past] : [],
		future: timing === 1 ? [] : [nogan, ...future],
		memo,
	})
	memo.store(key, peak)
	return peak
}

/**
 * Peak at a cell to see how it's firing right now.
 * @param {Nogan} nogan
 * @param {{
 * 	id: CellId,
 * 	colour: PulseColour,
 * 	past: Nogan[],
 * 	future: Nogan[],
 *	memo?: GetPeakMemo,
 * }} options
 * @returns {Peak}
 */
const getPeakNow = (nogan, { id, colour, past, future, memo = new GetPeakMemo() }) => {
	const cell = getCell(nogan, id)
	const { fire } = cell
	const pulse = fire[colour]

	let peak = createPeak({ pulse })
	if (peak.final) return peak // this may cause issues. it's just for perf. remove if necessary

	for (const input of cell.inputs) {
		const wire = getWire(nogan, input)
		if (wire.colour !== "any" && wire.colour !== colour) {
			continue
		}

		const inputPeak = getPeak(nogan, {
			id: wire.source,
			timing: getFlippedTiming(wire.timing),
			colour,
			past,
			future,
			memo,
		})

		if (!inputPeak.result) continue
		peak = getBehavedPeak({
			nogan,
			source: wire.source,
			target: wire.target,
			previous: peak,
			next: inputPeak,
		})
		if (peak.final) return peak // this may cause issues. it's just for perf. remove if necessary
	}
	return peak
}

/**
 * Check if a cell is firing right now.
 * @param {Nogan} nogan
 * @param {{
 * 	id: CellId,
 * }} options
 * @returns {boolean}
 */
export const isFiring = (nogan, { id }) => {
	for (const colour of PULSE_COLOURS) {
		const peak = getPeak(nogan, { id, colour })
		if (peak.result) return true
	}
	return false
}

//========//
// Behave //
//========//
/**
 * Apply a behaviour to a peak.
 * @param {{
 *  nogan: Nogan,
 *  source: CellId,
 *  target: CellId,
 *  previous: Peak,
 *  next: SuccessPeak,
 * }} options
 */
const getBehavedPeak = ({ nogan, source, target, previous, next }) => {
	const behave = getBehave(next.pulse)
	const behaved = behave({ nogan, source, target, previous, next })
	validate(behaved, N.Peak)
	return behaved
}

/**
 * @template {Pulse} T
 * @param {T} pulse
 * @returns {Behave<T>}
 */
export const getBehave = (pulse) => {
	const behave = BEHAVIOURS[pulse.type]
	// @ts-expect-error
	return behave
}

//=========//
// Refresh //
//=========//
let PROPOGATE_DEFAULT = true
const MAX_OPERATION_STACK = 1000

/**
 * Refresh a the state of all cells in a nogan.
 * @param {Nogan} nogan
 * @param {{
 * 	snapshot?: Nogan,
 * 	past?: Nogan[],
 * 	future?: Nogan[],
 * 	operate?: boolean,
 * 	filter?: (id: CellId) => boolean,
 * }} options
 * @return {Operation[]}
 */
export const refresh = (
	nogan,
	{ snapshot = getClone(nogan), past = [], future = [], operate = true, filter } = {},
) => {
	const operations = []
	for (const id of iterateCellIds(snapshot)) {
		if (filter && !filter(id)) continue
		for (const colour of PULSE_COLOURS) {
			const peak = getPeak(snapshot, { id, colour, past, future })
			operations.push(...peak.operations)
			if (!peak.result) continue
			const firedOperations = fireCell(nogan, {
				id,
				colour,
				pulse: peak.pulse,
				propogate: false,
			})
			operations.push(...firedOperations)
		}
	}

	if (operate) {
		PROPOGATE_DEFAULT = false
		let currentOperations = operations
		let stackSize = 0
		while (currentOperations.length > 0) {
			const bonusOperations = applyOperations(nogan, { operations })
			operations.push(...bonusOperations)
			currentOperations = bonusOperations
			stackSize++
			if (stackSize > MAX_OPERATION_STACK) {
				throw new Error("Operation stack overflow!")
			}
		}
		PROPOGATE_DEFAULT = true
	}
	return operations
}

//===========//
// Advancing //
//===========//
/**
 * Gets the state of a nogan on the next beat.
 * It does this by projecting the nogan and then refreshing it, using the current nogan as the past.
 * @param {Nogan} nogan
 * @param {{
 * 	past?: Nogan[],
 * }} options
 * @returns {{advanced: Nogan, operations: Operation[], unfiredOperations: Operation[]}}
 */
export const getAdvanced = (nogan, { past = [] } = {}) => {
	const { projection, operations: unfiredOperations } = getProjection(nogan)
	const operations = refresh(projection, { past: [nogan, ...past] })
	validate(projection, N.Nogan)
	return { advanced: projection, operations, unfiredOperations }
}

//===========//
// Operating //
//===========//
/**
 * Apply operations to a nogan.
 * @param {Nogan} nogan
 * @param {{
 * 	operations: Operation[]
 * }} options
 */
export const applyOperations = (nogan, { operations }) => {
	const allBonusOperations = []
	for (const operation of operations) {
		const operate = getOperate(operation)
		const bonusOperations = operate(nogan, operation)
		allBonusOperations.push(...bonusOperations)
	}
	return allBonusOperations
}

/**
 * @template {Operation} T
 * @param {T} operation
 * @returns {Operate<T>}
 */
export const getOperate = (operation) => {
	const operate = OPERATIONS[operation.type]
	// @ts-expect-error
	return operate
}
