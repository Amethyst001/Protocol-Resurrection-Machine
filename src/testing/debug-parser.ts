/**
 * @protocol Demo Chat
 * @rfc demo-chat
 * @port 8080
 * @description A simple chat protocol
 *
 * @example
 * ```typescript
 * import { Demo ChatClient } from './client';
 *
 * const client = new Demo ChatClient();
 * await client.connect('localhost');
 * ```
 */
/**
 * Generated Parser for Demo Chat Protocol
 * RFC: demo-chat
 * Port: 8080
 *
 * This file is auto-generated. Do not edit manually.
 * Regenerate using: protocol-resurrection-machine generate demo-chat.yaml
 */

import { Readable } from 'stream';

/**
 * Result of a parse operation
 */
export interface ParseResult<T> {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed message (if successful) */
  message?: T;
  /** Parse error (if failed) */
  error?: ParseError;
  /** Number of bytes consumed from input */
  bytesConsumed: number;
}

/**
 * Parse error with detailed information
 */
export interface ParseError {
  /** Error message */
  message: string;
  /** Byte offset where error occurred */
  offset: number;
  /** Expected format or value */
  expected: string;
  /** Actual data encountered */
  actual: string;
  /** Field context (if applicable) */
  fieldName?: string;
}

/**
 * Login message
 * Direction: request
 * Format: LOGIN {username}

 */
export interface Login {
  /** username field */
  username: string;
}

/**
 * Message message
 * Direction: bidirectional
 * Format: MSG {content}

 */
export interface Message {
  /** content field */
  content: string;
}

/**
 * State Machine Parser for Login
 * Format: LOGIN {username}

 * Generated using state machine approach
 */
export class LoginParser {
 	/**
 	 * Parse a Login message from a Buffer
 	 * @param data - Buffer containing the message data
 	 * @param offset - Starting offset in the buffer (default: 0)
 	 * @returns Parse result with message or error
 	 */
 	parse(data: Buffer, offset: number = 0): ParseResult<Login> {
 	 	// Initialize execution context
 	 	const context: ExecutionContext = {
 	 	 	currentState: 'init',
 	 	 	offset,
 	 	 	fields: new Map(),
 	 	 	data,
 	 	 	stateHistory: ['init'],
 	 	 	completed: false,
 	 	};

 	 	// Execute state machine
 	 	while (!context.completed) {
 	 	 	const state = this.getState(context.currentState);

 	 	 	if (!state) {
 	 	 	 	return this.createError(
 	 	 	 	 	'Internal error: invalid state',
 	 	 	 	 	context.currentState,
 	 	 	 	 	context.offset,
 	 	 	 	 	'valid state',
 	 	 	 	 	context.currentState,
 	 	 	 	 	context.stateHistory
 	 	 	 	);
 	 	 	}

 	 	 	// Execute state
 	 	 	const result = this.executeState(state, context);

 	 	 	if (!result.success) {
 	 	 	 	return result;
 	 	 	}
 	 	}

 	 	// Build message from extracted fields
 	 	const message: any = {};
 	 	if (context.fields.has('username')) {
 	 	 	message.username = context.fields.get('username');
 	 	} else {
 	 	 	return this.createError(
 	 	 	 	'Required field username not extracted',
 	 	 	 	context.currentState,
 	 	 	 	context.offset,
 	 	 	 	'field username',
 	 	 	 	'missing',
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	return {
 	 	 	success: true,
 	 	 	message: message as Login,
 	 	 	bytesConsumed: context.offset - offset,
 	 	};
 	}

 	/**
 	 * Execute a single state
 	 */
 	private executeState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	switch (state.type) {
 	 	 	case 'INIT':
 	 	 	 	return this.executeInitState(state, context);

 	 	 	case 'EXPECT_FIXED':
 	 	 	 	return this.executeExpectFixedState(state, context);

 	 	 	case 'EXTRACT_FIELD':
 	 	 	 	return this.executeExtractFieldState(state, context);

 	 	 	case 'EXPECT_DELIMITER':
 	 	 	 	return this.executeExpectDelimiterState(state, context);

 	 	 	case 'OPTIONAL_FIELD':
 	 	 	 	return this.executeOptionalFieldState(state, context);

 	 	 	case 'ACCEPT':
 	 	 	 	context.completed = true;
 	 	 	 	return { success: true, bytesConsumed: 0 };

 	 	 	case 'ERROR':
 	 	 	 	return this.createError(
 	 	 	 	 	state.errorMessage || 'Parse error',
 	 	 	 	 	state.id,
 	 	 	 	 	context.offset,
 	 	 	 	 	'valid input',
 	 	 	 	 	this.getActualData(context.data, context.offset),
 	 	 	 	 	context.stateHistory
 	 	 	 	);

 	 	 	default:
 	 	 	 	return this.createError(
 	 	 	 	 	'Unknown state type',
 	 	 	 	 	state.id,
 	 	 	 	 	context.offset,
 	 	 	 	 	'known state type',
 	 	 	 	 	state.type,
 	 	 	 	 	context.stateHistory
 	 	 	 	);
 	 	}
 	}

 	/**
 	 * Get state by ID
 	 */
 	private getState(stateId: string): State | null {
 	 	const states: Record<string, State> = {
 	 	 	'init': {
 	 	 	 	id: 'init',
 	 	 	 	type: 'INIT',
 	 	 	 	name: "Initial State",
 	 	 	 	transitions: [{"from":"init","to":"fixed_0","condition":{"type":"always"},"priority":10}],
 	 	 	 	isTerminal: false,
 	 	 	},
 	 	 	'accept': {
 	 	 	 	id: 'accept',
 	 	 	 	type: 'ACCEPT',
 	 	 	 	name: "Accept State",
 	 	 	 	transitions: [],
 	 	 	 	isTerminal: true,
 	 	 	},
 	 	 	'error': {
 	 	 	 	id: 'error',
 	 	 	 	type: 'ERROR',
 	 	 	 	name: "Error State",
 	 	 	 	transitions: [],
 	 	 	 	isTerminal: true,
 	 	 	 	errorMessage: "Parse error",
 	 	 	},
 	 	 	'fixed_0': {
 	 	 	 	id: 'fixed_0',
 	 	 	 	type: 'EXPECT_FIXED',
 	 	 	 	name: "Expect Fixed: \"LOGIN \"",
 	 	 	 	transitions: [{"from":"fixed_0","to":"extract_1","condition":{"type":"always"},"priority":10}],
 	 	 	 	isTerminal: false,
 	 	 	 	action: {"type":"validate","expected":"LOGIN "},
 	 	 	},
 	 	 	'extract_1': {
 	 	 	 	id: 'extract_1',
 	 	 	 	type: 'EXTRACT_FIELD',
 	 	 	 	name: "Extract Field: username",
 	 	 	 	transitions: [{"from":"extract_1","to":"fixed_2","condition":{"type":"always"},"priority":10}],
 	 	 	 	isTerminal: false,
 	 	 	 	action: {"type":"extract","target":"username","converter":"toString"},
 	 	 	 	metadata: {"fieldName":"username","fieldType":"string"},
 	 	 	},
 	 	 	'fixed_2': {
 	 	 	 	id: 'fixed_2',
 	 	 	 	type: 'EXPECT_FIXED',
 	 	 	 	name: "Expect Fixed: \"\n\"",
 	 	 	 	transitions: [{"from":"fixed_2","to":"accept","condition":{"type":"always"},"priority":10}],
 	 	 	 	isTerminal: false,
 	 	 	 	action: {"type":"validate","expected":"\n"},
 	 	 	},
 	 	};

 	 	return states[stateId] || null;
 	}

 	/**
 	 * Execute INIT state
 	 */
 	private executeInitState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}

 	/**
 	 * Execute EXPECT_FIXED state
 	 */
 	private executeExpectFixedState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	if (!state.action || !state.action.expected) {
 	 	 	return this.createError(
 	 	 	 	'EXPECT_FIXED state missing expected value',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	'expected value',
 	 	 	 	'none',
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	const expected = state.action.expected as string;
 	 	const expectedBuf = Buffer.from(expected, 'utf-8');

 	 	// Check if we have enough data
 	 	if (context.offset + expectedBuf.length > context.data.length) {
 	 	 	return this.createError(
 	 	 	 	'Unexpected end of data',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	expected,
 	 	 	 	this.getActualData(context.data, context.offset),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	// Compare buffers
 	 	if (context.data.compare(expectedBuf, 0, expectedBuf.length, context.offset, context.offset + expectedBuf.length) !== 0) {
 	 	 	return this.createError(
 	 	 	 	`Expected fixed string "${expected}"`,
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	expected,
 	 	 	 	context.data.toString('utf-8', context.offset, Math.min(context.offset + expectedBuf.length, context.data.length)),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	// Advance offset
 	 	context.offset += expectedBuf.length;

 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}

 	/**
 	 * Execute EXTRACT_FIELD state
 	 */
 	private executeExtractFieldState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	if (!state.action || !state.action.target) {
 	 	 	return this.createError(
 	 	 	 	'EXTRACT_FIELD state missing target field',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	'target field',
 	 	 	 	'none',
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	const fieldName = state.action.target;
 	 	const fieldType = state.metadata?.fieldType || 'string';

 	 	// Find the end of the field value
 	 	// This depends on what comes next (delimiter, fixed string, or terminator)
 	 	const endIndex = this.findFieldEnd(state, context);

 	 	if (endIndex === -1) {
 	 	 	return this.createError(
 	 	 	 	`Could not find end of field "${fieldName}"`,
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	'field boundary',
 	 	 	 	this.getActualData(context.data, context.offset),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	// Extract field value
 	 	const rawValue = context.data.toString('utf-8', context.offset, endIndex);

 	 	// Convert to appropriate type
 	 	const convertedValue = this.convertFieldValue(rawValue, fieldType, fieldName, state.id, context);
 	 	if (convertedValue.error) {
 	 	 	return convertedValue.error;
 	 	}

 	 	// Store field value
 	 	context.fields.set(fieldName, convertedValue.value);

 	 	// Advance offset
 	 	context.offset = endIndex;

 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}


 	/**
 	 * Execute EXPECT_DELIMITER state
 	 */
 	private executeExpectDelimiterState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	if (!state.action || !state.action.expected) {
 	 	 	return this.createError(
 	 	 	 	'EXPECT_DELIMITER state missing expected delimiter',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	'delimiter',
 	 	 	 	'none',
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	const delimiter = state.action.expected as string;
 	 	const delimiterBuf = Buffer.from(delimiter, 'utf-8');

 	 	// Check if delimiter matches
 	 	if (context.offset + delimiterBuf.length > context.data.length) {
 	 	 	return this.createError(
 	 	 	 	'Unexpected end of data',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	delimiter,
 	 	 	 	this.getActualData(context.data, context.offset),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	if (context.data.compare(delimiterBuf, 0, delimiterBuf.length, context.offset, context.offset + delimiterBuf.length) !== 0) {
 	 	 	return this.createError(
 	 	 	 	`Expected delimiter "${delimiter}"`,
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	delimiter,
 	 	 	 	context.data.toString('utf-8', context.offset, Math.min(context.offset + delimiterBuf.length, context.data.length)),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	// Advance offset
 	 	context.offset += delimiterBuf.length;

 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}

 	/**
 	 * Execute OPTIONAL_FIELD state
 	 */
 	private executeOptionalFieldState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	// Try to extract the field, but don't fail if it's not present
 	 	const fieldName = state.action?.target;
 	 	if (!fieldName) {
 	 	 	// Skip this state if no field name
 	 	 	return this.transitionToNext(state, context);
 	 	}

 	 	// Try to find field end
 	 	const endIndex = this.findFieldEnd(state, context);

 	 	if (endIndex === -1) {
 	 	 	// Field boundary not found, skip it (i.e., field is not present)
 	 	 	return this.transitionToNext(state, context);
 	 	}

 	 	// Extract and convert field value
 	 	const rawValue = context.data.toString('utf-8', context.offset, endIndex);
 	 	const fieldType = state.metadata?.fieldType || 'string';
 	 	const convertedValue = this.convertFieldValue(rawValue, fieldType, fieldName, state.id, context);

 	 	if (!convertedValue.error) {
 	 	 	context.fields.set(fieldName, convertedValue.value);
 	 	 	context.offset = endIndex;
 	 	}

 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}


 	/**
 	 * Transition to the next state
 	 */
 	private transitionToNext(state: State, context: ExecutionContext): ParseResult<any> {
 	 	// Find the first matching transition
 	 	for (const transition of state.transitions) {
 	 	 	if (this.evaluateTransitionCondition(transition.condition, context)) {
 	 	 	 	context.currentState = transition.to;
 	 	 	 	context.stateHistory.push(transition.to);
 	 	 	 	return { success: true, bytesConsumed: 0 };
 	 	 	}
 	 	}

 	 	// No matching transition found
 	 	return this.createError(
 	 	 	'No valid transition from current state',
 	 	 	state.id,
 	 	 	context.offset,
 	 	 	'valid transition',
 	 	 	'none',
 	 	 	context.stateHistory
 	 	);
 	}

 	/**
 	 * Evaluate a transition condition
 	 */
 	private evaluateTransitionCondition(condition: any, context: ExecutionContext): boolean {
 	 	switch (condition.type) {
 	 	 	case 'always':
 	 	 	 	return true;

 	 	 	case 'on-match':
 	 	 	 	if (!condition.matchValue) return false;
 	 	 	 	const matchBuf = Buffer.from(condition.matchValue, 'utf-8');
 	 	 	 	if (context.offset + matchBuf.length > context.data.length) return false;
 	 	 	 	return context.data.compare(matchBuf, 0, matchBuf.length, context.offset, context.offset + matchBuf.length) === 0;

 	 	 	case 'on-delimiter':
 	 	 	 	return true; // Delimiter already validated in EXPECT_DELIMITER state

 	 	 	case 'on-length':
 	 	 	 	if (!condition.length) return false;
 	 	 	 	return context.offset + condition.length <= context.data.length;

 	 	 	case 'on-optional':
 	 	 	 	return true; // Optional fields always allow transition

 	 	 	default:
 	 	 	 	return false;
 	 	}
 	}
 	/**
 	 * Find the end of a field value
 	 */
 	private findFieldEnd(state: State, context: ExecutionContext): number {
 	 	// Look at the next state to determine what marks the end of this field
 	 	if (state.transitions.length === 0) {
 	 	 	// No transitions, use end of data
 	 	 	return context.data.length;
 	 	}

 	 	const nextTransition = state.transitions[0];
 	 	if (!nextTransition) return context.data.length;

 	 	const nextState = this.getState(nextTransition.to);
 	 	if (!nextState) return context.data.length;

 	 	// Check what the next state expects
 	 	if (nextState.type === 'EXPECT_FIXED' && nextState.action?.expected) {
 	 	 	// Find the next fixed string
 	 	 	const fixedStr = nextState.action.expected as string;
 	 	 	const fixedBuf = Buffer.from(fixedStr, 'utf-8');
 	 	 	const index = context.data.indexOf(fixedBuf, context.offset);
 	 	 	return index === -1 ? -1 : index;
 	 	}

 	 	if (nextState.type === 'EXPECT_DELIMITER' && nextState.action?.expected) {
 	 	 	// Find the next delimiter
 	 	 	const delimiter = nextState.action.expected as string;
 	 	 	const delimBuf = Buffer.from(delimiter, 'utf-8');
 	 	 	const index = context.data.indexOf(delimBuf, context.offset);
 	 	 	return index === -1 ? -1 : index;
 	 	}

 	 	 if (nextState.type === 'OPTIONAL_FIELD' && nextState.metadata?.optionalPrefix) {
 	 	 	 // Find the optional section marker (e.g., "[TIMEOUT:")
 	 	 	 const optPrefix = '[' + nextState.metadata.optionalPrefix;
 	 	 	 const optBuf = Buffer.from(optPrefix, 'utf-8');
 	 	 	 const index = context.data.indexOf(optBuf, context.offset);
 	 	 	 if (index !== -1) return index;
 	 	 	 // If not found, continue to fallback scanning
 	 	 }

        // Fallback: Scan for common terminators (tab, CRLF) to prevent over-consumption
        const nextTab = context.data.indexOf('\t', context.offset);
 	 	const nextCRLF = context.data.indexOf('\r\n', context.offset);

 	 	if (nextTab !== -1 && (nextCRLF === -1 || nextTab < nextCRLF)) return nextTab;
 	 	if (nextCRLF !== -1) return nextCRLF;

 	 	// Default: use end of data
 	 	return context.data.length;
 	}


 	/**
 	 * Convert field value to appropriate type
 	 */
 	private convertFieldValue(
 	 	rawValue: string,
 	 	fieldType: string,
 	 	fieldName: string,
 	 	stateId: string,
 	 	context: ExecutionContext
 	): { value?: any; error?: ParseResult<any> } {
 	 	switch (fieldType) {
 	 	 	case 'string':
 	 	 	 	return { value: rawValue };

 	 	 	case 'number': {
 	 	 	 	const num = parseInt(rawValue, 10);
 	 	 	 	// Note: Empty string is a common cause for isNaN. Protocols often define
 	 	 	 	// numbers as optional if they can be empty. We allow NaN if not required.
 	 	 	 	if (rawValue !== '' && isNaN(num)) {
 	 	 	 	 	return {
 	 	 	 	 	 	error: this.createError(
 	 	 	 	 	 	 	`Field "${fieldName}" is not a valid number`,
 	 	 	 	 	 	 	stateId,
 	 	 	 	 	 	 	context.offset,
 	 	 	 	 	 	 	'number',
 	 	 	 	 	 	 	rawValue,
 	 	 	 	 	 	 	context.stateHistory
 	 	 	 	 	 	),
 	 	 	 	 	};
 	 	 	 	}
 	 	 	 	return { value: num };
 	 	 	}

 	 	 	case 'boolean':
 	 	 	 	return { value: rawValue === 'true' || rawValue === '1' };

 	 	 	case 'enum':
 	 	 	 	// Enum validation should be done separately
 	 	 	 	return { value: rawValue };

 	 	 	case 'bytes':
 	 	 	 	return { value: Buffer.from(rawValue, 'utf-8') };

 	 	 	default:
 	 	 	 	return { value: rawValue };
 	 	}
 	}

 	/**
 	 * Get actual data for error messages (truncated)
 	 */
 	private getActualData(data: Buffer, offset: number, maxLength: number = 50): string {
 	 	const endOffset = Math.min(offset + maxLength, data.length);
 	 	const actual = data.toString('utf-8', offset, endOffset);
 	 	return actual.length < maxLength ? actual : actual + '...';
 	}

 	/**
 	 * Create an error result with detailed context
 	 */
 	private createError(
 	 	message: string,
 	 	state: string,
 	 	offset: number,
 	 	expected: string,
 	 	actual: string,
 	 	stateHistory: string[]
 	): ParseResult<any> {
 	 	return {
 	 	 	success: false,
 	 	 	error: {
 	 	 	 	message,
 	 	 	 	state,
 	 	 	 	offset,
 	 	 	 	expected,
 	 	 	 	actual,
 	 	 	 	stateHistory,
 	 	 	},
 	 	 	bytesConsumed: 0,
 	 	};
 	}

 	/**
 	 * Evaluate a transition condition
 	 */
 	private evaluateTransitionCondition(condition: any, context: ExecutionContext): boolean {
 	 	switch (condition.type) {
 	 	 	case 'always':
 	 	 	 	return true;

 	 	 	case 'on-match':
 	 	 	 	if (!condition.matchValue) return false;
 	 	 	 	const matchBuf = Buffer.from(condition.matchValue, 'utf-8');
 	 	 	 	if (context.offset + matchBuf.length > context.data.length) return false;
 	 	 	 	return context.data.compare(matchBuf, 0, matchBuf.length, context.offset, context.offset + matchBuf.length) === 0;

 	 	 	case 'on-delimiter':
 	 	 	 	return true; // Delimiter already validated in EXPECT_DELIMITER state

 	 	 	case 'on-length':
 	 	 	 	if (!condition.length) return false;
 	 	 	 	return context.offset + condition.length <= context.data.length;

 	 	 	case 'on-optional':
 	 	 	 	return true; // Optional fields always allow transition

 	 	 	default:
 	 	 	 	return false;
 	 	}
 	}
 	/**
 	 * Find the end of a field value
 	 */
 	private findFieldEnd(state: State, context: ExecutionContext): number {
 	 	// Look at the next state to determine what marks the end of this field
 	 	if (state.transitions.length === 0) {
 	 	 	// No transitions, use end of data
 	 	 	return context.data.length;
 	 	}

 	 	const nextTransition = state.transitions[0];
 	 	if (!nextTransition) return context.data.length;

 	 	const nextState = this.getState(nextTransition.to);
 	 	if (!nextState) return context.data.length;

 	 	// Check what the next state expects
 	 	if (nextState.type === 'EXPECT_FIXED' && nextState.action?.expected) {
 	 	 	// Find the next fixed string
 	 	 	const fixedStr = nextState.action.expected as string;
 	 	 	const fixedBuf = Buffer.from(fixedStr, 'utf-8');
 	 	 	const index = context.data.indexOf(fixedBuf, context.offset);
 	 	 	return index === -1 ? -1 : index;
 	 	}

 	 	if (nextState.type === 'EXPECT_DELIMITER' && nextState.action?.expected) {
 	 	 	// Find the next delimiter
 	 	 	const delimiter = nextState.action.expected as string;
 	 	 	const delimBuf = Buffer.from(delimiter, 'utf-8');
 	 	 	const index = context.data.indexOf(delimBuf, context.offset);
 	 	 	return index === -1 ? -1 : index;
 	 	}

        // Fallback: Scan for common terminators (tab, CRLF) to prevent over-consumption
        const nextTab = context.data.indexOf('\t', context.offset);
 	 	const nextCRLF = context.data.indexOf('\r\n', context.offset);

 	 	if (nextTab !== -1 && (nextCRLF === -1 || nextTab < nextCRLF)) return nextTab;
 	 	if (nextCRLF !== -1) return nextCRLF;

 	 	// Default: use end of data
 	 	return context.data.length;
 	}

}

/**
 * State Machine Parser for Message
 * Format: MSG {content}

 * Generated using state machine approach
 */
export class MessageParser {
 	/**
 	 * Parse a Message message from a Buffer
 	 * @param data - Buffer containing the message data
 	 * @param offset - Starting offset in the buffer (default: 0)
 	 * @returns Parse result with message or error
 	 */
 	parse(data: Buffer, offset: number = 0): ParseResult<Message> {
 	 	// Initialize execution context
 	 	const context: ExecutionContext = {
 	 	 	currentState: 'init',
 	 	 	offset,
 	 	 	fields: new Map(),
 	 	 	data,
 	 	 	stateHistory: ['init'],
 	 	 	completed: false,
 	 	};

 	 	// Execute state machine
 	 	while (!context.completed) {
 	 	 	const state = this.getState(context.currentState);

 	 	 	if (!state) {
 	 	 	 	return this.createError(
 	 	 	 	 	'Internal error: invalid state',
 	 	 	 	 	context.currentState,
 	 	 	 	 	context.offset,
 	 	 	 	 	'valid state',
 	 	 	 	 	context.currentState,
 	 	 	 	 	context.stateHistory
 	 	 	 	);
 	 	 	}

 	 	 	// Execute state
 	 	 	const result = this.executeState(state, context);

 	 	 	if (!result.success) {
 	 	 	 	return result;
 	 	 	}
 	 	}

 	 	// Build message from extracted fields
 	 	const message: any = {};
 	 	if (context.fields.has('content')) {
 	 	 	message.content = context.fields.get('content');
 	 	} else {
 	 	 	return this.createError(
 	 	 	 	'Required field content not extracted',
 	 	 	 	context.currentState,
 	 	 	 	context.offset,
 	 	 	 	'field content',
 	 	 	 	'missing',
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	return {
 	 	 	success: true,
 	 	 	message: message as Message,
 	 	 	bytesConsumed: context.offset - offset,
 	 	};
 	}

 	/**
 	 * Execute a single state
 	 */
 	private executeState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	switch (state.type) {
 	 	 	case 'INIT':
 	 	 	 	return this.executeInitState(state, context);

 	 	 	case 'EXPECT_FIXED':
 	 	 	 	return this.executeExpectFixedState(state, context);

 	 	 	case 'EXTRACT_FIELD':
 	 	 	 	return this.executeExtractFieldState(state, context);

 	 	 	case 'EXPECT_DELIMITER':
 	 	 	 	return this.executeExpectDelimiterState(state, context);

 	 	 	case 'OPTIONAL_FIELD':
 	 	 	 	return this.executeOptionalFieldState(state, context);

 	 	 	case 'ACCEPT':
 	 	 	 	context.completed = true;
 	 	 	 	return { success: true, bytesConsumed: 0 };

 	 	 	case 'ERROR':
 	 	 	 	return this.createError(
 	 	 	 	 	state.errorMessage || 'Parse error',
 	 	 	 	 	state.id,
 	 	 	 	 	context.offset,
 	 	 	 	 	'valid input',
 	 	 	 	 	this.getActualData(context.data, context.offset),
 	 	 	 	 	context.stateHistory
 	 	 	 	);

 	 	 	default:
 	 	 	 	return this.createError(
 	 	 	 	 	'Unknown state type',
 	 	 	 	 	state.id,
 	 	 	 	 	context.offset,
 	 	 	 	 	'known state type',
 	 	 	 	 	state.type,
 	 	 	 	 	context.stateHistory
 	 	 	 	);
 	 	}
 	}

 	/**
 	 * Get state by ID
 	 */
 	private getState(stateId: string): State | null {
 	 	const states: Record<string, State> = {
 	 	 	'init': {
 	 	 	 	id: 'init',
 	 	 	 	type: 'INIT',
 	 	 	 	name: "Initial State",
 	 	 	 	transitions: [{"from":"init","to":"fixed_0","condition":{"type":"always"},"priority":10}],
 	 	 	 	isTerminal: false,
 	 	 	},
 	 	 	'accept': {
 	 	 	 	id: 'accept',
 	 	 	 	type: 'ACCEPT',
 	 	 	 	name: "Accept State",
 	 	 	 	transitions: [],
 	 	 	 	isTerminal: true,
 	 	 	},
 	 	 	'error': {
 	 	 	 	id: 'error',
 	 	 	 	type: 'ERROR',
 	 	 	 	name: "Error State",
 	 	 	 	transitions: [],
 	 	 	 	isTerminal: true,
 	 	 	 	errorMessage: "Parse error",
 	 	 	},
 	 	 	'fixed_0': {
 	 	 	 	id: 'fixed_0',
 	 	 	 	type: 'EXPECT_FIXED',
 	 	 	 	name: "Expect Fixed: \"MSG \"",
 	 	 	 	transitions: [{"from":"fixed_0","to":"extract_1","condition":{"type":"always"},"priority":10}],
 	 	 	 	isTerminal: false,
 	 	 	 	action: {"type":"validate","expected":"MSG "},
 	 	 	},
 	 	 	'extract_1': {
 	 	 	 	id: 'extract_1',
 	 	 	 	type: 'EXTRACT_FIELD',
 	 	 	 	name: "Extract Field: content",
 	 	 	 	transitions: [{"from":"extract_1","to":"fixed_2","condition":{"type":"always"},"priority":10}],
 	 	 	 	isTerminal: false,
 	 	 	 	action: {"type":"extract","target":"content","converter":"toString"},
 	 	 	 	metadata: {"fieldName":"content","fieldType":"string"},
 	 	 	},
 	 	 	'fixed_2': {
 	 	 	 	id: 'fixed_2',
 	 	 	 	type: 'EXPECT_FIXED',
 	 	 	 	name: "Expect Fixed: \"\n\"",
 	 	 	 	transitions: [{"from":"fixed_2","to":"accept","condition":{"type":"always"},"priority":10}],
 	 	 	 	isTerminal: false,
 	 	 	 	action: {"type":"validate","expected":"\n"},
 	 	 	},
 	 	};

 	 	return states[stateId] || null;
 	}

 	/**
 	 * Execute INIT state
 	 */
 	private executeInitState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}

 	/**
 	 * Execute EXPECT_FIXED state
 	 */
 	private executeExpectFixedState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	if (!state.action || !state.action.expected) {
 	 	 	return this.createError(
 	 	 	 	'EXPECT_FIXED state missing expected value',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	'expected value',
 	 	 	 	'none',
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	const expected = state.action.expected as string;
 	 	const expectedBuf = Buffer.from(expected, 'utf-8');

 	 	// Check if we have enough data
 	 	if (context.offset + expectedBuf.length > context.data.length) {
 	 	 	return this.createError(
 	 	 	 	'Unexpected end of data',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	expected,
 	 	 	 	this.getActualData(context.data, context.offset),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	// Compare buffers
 	 	if (context.data.compare(expectedBuf, 0, expectedBuf.length, context.offset, context.offset + expectedBuf.length) !== 0) {
 	 	 	return this.createError(
 	 	 	 	`Expected fixed string "${expected}"`,
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	expected,
 	 	 	 	context.data.toString('utf-8', context.offset, Math.min(context.offset + expectedBuf.length, context.data.length)),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	// Advance offset
 	 	context.offset += expectedBuf.length;

 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}

 	/**
 	 * Execute EXTRACT_FIELD state
 	 */
 	private executeExtractFieldState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	if (!state.action || !state.action.target) {
 	 	 	return this.createError(
 	 	 	 	'EXTRACT_FIELD state missing target field',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	'target field',
 	 	 	 	'none',
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	const fieldName = state.action.target;
 	 	const fieldType = state.metadata?.fieldType || 'string';

 	 	// Find the end of the field value
 	 	// This depends on what comes next (delimiter, fixed string, or terminator)
 	 	const endIndex = this.findFieldEnd(state, context);

 	 	if (endIndex === -1) {
 	 	 	return this.createError(
 	 	 	 	`Could not find end of field "${fieldName}"`,
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	'field boundary',
 	 	 	 	this.getActualData(context.data, context.offset),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	// Extract field value
 	 	const rawValue = context.data.toString('utf-8', context.offset, endIndex);

 	 	// Convert to appropriate type
 	 	const convertedValue = this.convertFieldValue(rawValue, fieldType, fieldName, state.id, context);
 	 	if (convertedValue.error) {
 	 	 	return convertedValue.error;
 	 	}

 	 	// Store field value
 	 	context.fields.set(fieldName, convertedValue.value);

 	 	// Advance offset
 	 	context.offset = endIndex;

 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}


 	/**
 	 * Execute EXPECT_DELIMITER state
 	 */
 	private executeExpectDelimiterState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	if (!state.action || !state.action.expected) {
 	 	 	return this.createError(
 	 	 	 	'EXPECT_DELIMITER state missing expected delimiter',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	'delimiter',
 	 	 	 	'none',
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	const delimiter = state.action.expected as string;
 	 	const delimiterBuf = Buffer.from(delimiter, 'utf-8');

 	 	// Check if delimiter matches
 	 	if (context.offset + delimiterBuf.length > context.data.length) {
 	 	 	return this.createError(
 	 	 	 	'Unexpected end of data',
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	delimiter,
 	 	 	 	this.getActualData(context.data, context.offset),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	if (context.data.compare(delimiterBuf, 0, delimiterBuf.length, context.offset, context.offset + delimiterBuf.length) !== 0) {
 	 	 	return this.createError(
 	 	 	 	`Expected delimiter "${delimiter}"`,
 	 	 	 	state.id,
 	 	 	 	context.offset,
 	 	 	 	delimiter,
 	 	 	 	context.data.toString('utf-8', context.offset, Math.min(context.offset + delimiterBuf.length, context.data.length)),
 	 	 	 	context.stateHistory
 	 	 	);
 	 	}

 	 	// Advance offset
 	 	context.offset += delimiterBuf.length;

 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}

 	/**
 	 * Execute OPTIONAL_FIELD state
 	 */
 	private executeOptionalFieldState(state: State, context: ExecutionContext): ParseResult<any> {
 	 	// Try to extract the field, but don't fail if it's not present
 	 	const fieldName = state.action?.target;
 	 	if (!fieldName) {
 	 	 	// Skip this state if no field name
 	 	 	return this.transitionToNext(state, context);
 	 	}

 	 	// Try to find field end
 	 	const endIndex = this.findFieldEnd(state, context);

 	 	if (endIndex === -1) {
 	 	 	// Field boundary not found, skip it (i.e., field is not present)
 	 	 	return this.transitionToNext(state, context);
 	 	}

 	 	// Extract and convert field value
 	 	const rawValue = context.data.toString('utf-8', context.offset, endIndex);
 	 	const fieldType = state.metadata?.fieldType || 'string';
 	 	const convertedValue = this.convertFieldValue(rawValue, fieldType, fieldName, state.id, context);

 	 	if (!convertedValue.error) {
 	 	 	context.fields.set(fieldName, convertedValue.value);
 	 	 	context.offset = endIndex;
 	 	}

 	 	// Transition to next state
 	 	return this.transitionToNext(state, context);
 	}


 	/**
 	 * Transition to the next state
 	 */
 	private transitionToNext(state: State, context: ExecutionContext): ParseResult<any> {
 	 	// Find the first matching transition
 	 	for (const transition of state.transitions) {
 	 	 	if (this.evaluateTransitionCondition(transition.condition, context)) {
 	 	 	 	context.currentState = transition.to;
 	 	 	 	context.stateHistory.push(transition.to);
 	 	 	 	return { success: true, bytesConsumed: 0 };
 	 	 	}
 	 	}

 	 	// No matching transition found
 	 	return this.createError(
 	 	 	'No valid transition from current state',
 	 	 	state.id,
 	 	 	context.offset,
 	 	 	'valid transition',
 	 	 	'none',
 	 	 	context.stateHistory
 	 	);
 	}

 	/**
 	 * Evaluate a transition condition
 	 */
 	private evaluateTransitionCondition(condition: any, context: ExecutionContext): boolean {
 	 	switch (condition.type) {
 	 	 	case 'always':
 	 	 	 	return true;

 	 	 	case 'on-match':
 	 	 	 	if (!condition.matchValue) return false;
 	 	 	 	const matchBuf = Buffer.from(condition.matchValue, 'utf-8');
 	 	 	 	if (context.offset + matchBuf.length > context.data.length) return false;
 	 	 	 	return context.data.compare(matchBuf, 0, matchBuf.length, context.offset, context.offset + matchBuf.length) === 0;

 	 	 	case 'on-delimiter':
 	 	 	 	return true; // Delimiter already validated in EXPECT_DELIMITER state

 	 	 	case 'on-length':
 	 	 	 	if (!condition.length) return false;
 	 	 	 	return context.offset + condition.length <= context.data.length;

 	 	 	case 'on-optional':
 	 	 	 	return true; // Optional fields always allow transition

 	 	 	default:
 	 	 	 	return false;
 	 	}
 	}
 	/**
 	 * Find the end of a field value
 	 */
 	private findFieldEnd(state: State, context: ExecutionContext): number {
 	 	// Look at the next state to determine what marks the end of this field
 	 	if (state.transitions.length === 0) {
 	 	 	// No transitions, use end of data
 	 	 	return context.data.length;
 	 	}

 	 	const nextTransition = state.transitions[0];
 	 	if (!nextTransition) return context.data.length;

 	 	const nextState = this.getState(nextTransition.to);
 	 	if (!nextState) return context.data.length;

 	 	// Check what the next state expects
 	 	if (nextState.type === 'EXPECT_FIXED' && nextState.action?.expected) {
 	 	 	// Find the next fixed string
 	 	 	const fixedStr = nextState.action.expected as string;
 	 	 	const fixedBuf = Buffer.from(fixedStr, 'utf-8');
 	 	 	const index = context.data.indexOf(fixedBuf, context.offset);
 	 	 	return index === -1 ? -1 : index;
 	 	}

 	 	if (nextState.type === 'EXPECT_DELIMITER' && nextState.action?.expected) {
 	 	 	// Find the next delimiter
 	 	 	const delimiter = nextState.action.expected as string;
 	 	 	const delimBuf = Buffer.from(delimiter, 'utf-8');
 	 	 	const index = context.data.indexOf(delimBuf, context.offset);
 	 	 	return index === -1 ? -1 : index;
 	 	}

 	 	 if (nextState.type === 'OPTIONAL_FIELD' && nextState.metadata?.optionalPrefix) {
 	 	 	 // Find the optional section marker (e.g., "[TIMEOUT:")
 	 	 	 const optPrefix = '[' + nextState.metadata.optionalPrefix;
 	 	 	 const optBuf = Buffer.from(optPrefix, 'utf-8');
 	 	 	 const index = context.data.indexOf(optBuf, context.offset);
 	 	 	 if (index !== -1) return index;
 	 	 	 // If not found, continue to fallback scanning
 	 	 }

        // Fallback: Scan for common terminators (tab, CRLF) to prevent over-consumption
        const nextTab = context.data.indexOf('\t', context.offset);
 	 	const nextCRLF = context.data.indexOf('\r\n', context.offset);

 	 	if (nextTab !== -1 && (nextCRLF === -1 || nextTab < nextCRLF)) return nextTab;
 	 	if (nextCRLF !== -1) return nextCRLF;

 	 	// Default: use end of data
 	 	return context.data.length;
 	}


 	/**
 	 * Convert field value to appropriate type
 	 */
 	private convertFieldValue(
 	 	rawValue: string,
 	 	fieldType: string,
 	 	fieldName: string,
 	 	stateId: string,
 	 	context: ExecutionContext
 	): { value?: any; error?: ParseResult<any> } {
 	 	switch (fieldType) {
 	 	 	case 'string':
 	 	 	 	return { value: rawValue };

 	 	 	case 'number': {
 	 	 	 	const num = parseInt(rawValue, 10);
 	 	 	 	// Note: Empty string is a common cause for isNaN. Protocols often define
 	 	 	 	// numbers as optional if they can be empty. We allow NaN if not required.
 	 	 	 	if (rawValue !== '' && isNaN(num)) {
 	 	 	 	 	return {
 	 	 	 	 	 	error: this.createError(
 	 	 	 	 	 	 	`Field "${fieldName}" is not a valid number`,
 	 	 	 	 	 	 	stateId,
 	 	 	 	 	 	 	context.offset,
 	 	 	 	 	 	 	'number',
 	 	 	 	 	 	 	rawValue,
 	 	 	 	 	 	 	context.stateHistory
 	 	 	 	 	 	),
 	 	 	 	 	};
 	 	 	 	}
 	 	 	 	return { value: num };
 	 	 	}

 	 	 	case 'boolean':
 	 	 	 	return { value: rawValue === 'true' || rawValue === '1' };

 	 	 	case 'enum':
 	 	 	 	// Enum validation should be done separately
 	 	 	 	return { value: rawValue };

 	 	 	case 'bytes':
 	 	 	 	return { value: Buffer.from(rawValue, 'utf-8') };

 	 	 	default:
 	 	 	 	return { value: rawValue };
 	 	}
 	}

 	/**
 	 * Get actual data for error messages (truncated)
 	 */
 	private getActualData(data: Buffer, offset: number, maxLength: number = 50): string {
 	 	const endOffset = Math.min(offset + maxLength, data.length);
 	 	const actual = data.toString('utf-8', offset, endOffset);
 	 	return actual.length < maxLength ? actual : actual + '...';
 	}

 	/**
 	 * Create an error result with detailed context
 	 */
 	private createError(
 	 	message: string,
 	 	state: string,
 	 	offset: number,
 	 	expected: string,
 	 	actual: string,
 	 	stateHistory: string[]
 	): ParseResult<any> {
 	 	return {
 	 	 	success: false,
 	 	 	error: {
 	 	 	 	message,
 	 	 	 	state,
 	 	 	 	offset,
 	 	 	 	expected,
 	 	 	 	actual,
 	 	 	 	stateHistory,
 	 	 	},
 	 	 	bytesConsumed: 0,
 	 	};
 	}

 	/**
 	 * Evaluate a transition condition
 	 */
 	private evaluateTransitionCondition(condition: any, context: ExecutionContext): boolean {
 	 	switch (condition.type) {
 	 	 	case 'always':
 	 	 	 	return true;

 	 	 	case 'on-match':
 	 	 	 	if (!condition.matchValue) return false;
 	 	 	 	const matchBuf = Buffer.from(condition.matchValue, 'utf-8');
 	 	 	 	if (context.offset + matchBuf.length > context.data.length) return false;
 	 	 	 	return context.data.compare(matchBuf, 0, matchBuf.length, context.offset, context.offset + matchBuf.length) === 0;

 	 	 	case 'on-delimiter':
 	 	 	 	return true; // Delimiter already validated in EXPECT_DELIMITER state

 	 	 	case 'on-length':
 	 	 	 	if (!condition.length) return false;
 	 	 	 	return context.offset + condition.length <= context.data.length;

 	 	 	case 'on-optional':
 	 	 	 	return true; // Optional fields always allow transition

 	 	 	default:
 	 	 	 	return false;
 	 	}
 	}
 	/**
 	 * Find the end of a field value
 	 */
 	private findFieldEnd(state: State, context: ExecutionContext): number {
 	 	// Look at the next state to determine what marks the end of this field
 	 	if (state.transitions.length === 0) {
 	 	 	// No transitions, use end of data
 	 	 	return context.data.length;
 	 	}

 	 	const nextTransition = state.transitions[0];
 	 	if (!nextTransition) return context.data.length;

 	 	const nextState = this.getState(nextTransition.to);
 	 	if (!nextState) return context.data.length;

 	 	// Check what the next state expects
 	 	if (nextState.type === 'EXPECT_FIXED' && nextState.action?.expected) {
 	 	 	// Find the next fixed string
 	 	 	const fixedStr = nextState.action.expected as string;
 	 	 	const fixedBuf = Buffer.from(fixedStr, 'utf-8');
 	 	 	const index = context.data.indexOf(fixedBuf, context.offset);
 	 	 	return index === -1 ? -1 : index;
 	 	}

 	 	if (nextState.type === 'EXPECT_DELIMITER' && nextState.action?.expected) {
 	 	 	// Find the next delimiter
 	 	 	const delimiter = nextState.action.expected as string;
 	 	 	const delimBuf = Buffer.from(delimiter, 'utf-8');
 	 	 	const index = context.data.indexOf(delimBuf, context.offset);
 	 	 	return index === -1 ? -1 : index;
 	 	}

        // Fallback: Scan for common terminators (tab, CRLF) to prevent over-consumption
        const nextTab = context.data.indexOf('\t', context.offset);
 	 	const nextCRLF = context.data.indexOf('\r\n', context.offset);

 	 	if (nextTab !== -1 && (nextCRLF === -1 || nextTab < nextCRLF)) return nextTab;
 	 	if (nextCRLF !== -1) return nextCRLF;

 	 	// Default: use end of data
 	 	return context.data.length;
 	}

}

/**
 * Main parser for Demo Chat protocol
 * Provides access to all message type parsers
 */
export class DemoChatParser {
  /** Parser for Login messages */
  public login: LoginParser;

  /** Parser for Message messages */
  public message: MessageParser;

  constructor() {
    this.login = new LoginParser();
    this.message = new MessageParser();
  }
}
/**
 * Runtime Validation Functions
 */
export function validateLogin(message: Login): string[] {
  const errors: string[] = [];
  if (message.username === undefined || message.username === null) {
    errors.push("Field 'username' is required");
  }
  return errors;
}

export function validateMessage(message: Message): string[] {
  const errors: string[] = [];
  if (message.content === undefined || message.content === null) {
    errors.push("Field 'content' is required");
  }
  return errors;
}

/**
 * Builders
 */
export class LoginBuilder {
  private message: Partial<Login> = {};

  public withUsername(value: string): LoginBuilder {
    this.message.username = value;
    return this;
  }

  public build(): Login {
    // Validate required fields
    const errors = validateLogin(this.message as Login);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
    return this.message as Login;
  }
}

export class MessageBuilder {
  private message: Partial<Message> = {};

  public withContent(value: string): MessageBuilder {
    this.message.content = value;
    return this;
  }

  public build(): Message {
    // Validate required fields
    const errors = validateMessage(this.message as Message);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
    return this.message as Message;
  }
}
