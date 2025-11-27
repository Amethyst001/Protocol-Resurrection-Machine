/**
 * State Machine Parser Generator
 * Generates TypeScript parser code from state machine representations.
 * Includes byte offset tracking, detailed error messages with state context,
 * and handles optional fields with branching states.
 */

// FIX: Removed unused 'State' and 'ExecutionContext' from imports to satisfy linter
import type { StateMachine } from '../core/state-machine.js';
import type { MessageType } from '../types/protocol-spec.js';
import { FormatAnalyzer } from '../core/format-analyzer.js';

/**
 * Code generation options
 */
export interface CodeGenOptions {
	/** Include detailed comments in generated code */
	includeComments?: boolean;

	/** Include debug logging statements */
	includeDebugLogging?: boolean;

	/** Maximum length of actual data to include in error messages */
	maxErrorDataLength?: number;
}

/**
 * State Machine Parser Generator
 * Generates parser code from state machine representations
 */
export class StateMachineParserGenerator {
	private analyzer: FormatAnalyzer;

	constructor() {
		this.analyzer = new FormatAnalyzer();
	}

	/**
	 * Generate parser code for a message type using state machine approach
	 * @param messageType - Message type definition
	 * @param options - Code generation options
	 * @returns Generated TypeScript parser code
	 */
	generateParser(messageType: MessageType, options: CodeGenOptions = {}): string {
		const stateMachine = this.analyzer.generateStateMachine(messageType);

		const lines: string[] = [];

		// Generate parser class
		lines.push(this.generateParserClass(messageType, stateMachine, options));

		return lines.join('\n');
	}

	/**
	 * Generate the parser class
	 */
	private generateParserClass(
		messageType: MessageType,
		stateMachine: StateMachine,
		options: CodeGenOptions
	): string {
		const className = `${messageType.name}Parser`;
		const maxErrorLength = options.maxErrorDataLength || 50;

		const lines: string[] = [];

		if (options.includeComments) {
			lines.push(`/**`);
			lines.push(` * State Machine Parser for ${messageType.name}`);
			lines.push(` * Format: ${messageType.format}`);
			lines.push(` * Generated using state machine approach`);
			lines.push(` */`);
		}

		lines.push(`export class ${className} {`);

		// Generate parse method
		lines.push(` 	/**`);
		lines.push(` 	 * Parse a ${messageType.name} message from a Buffer`);
		lines.push(` 	 * @param data - Buffer containing the message data`);
		lines.push(` 	 * @param offset - Starting offset in the buffer (default: 0)`);
		lines.push(` 	 * @returns Parse result with message or error`);
		lines.push(` 	 */`);
		lines.push(` 	parse(data: Buffer, offset: number = 0): ParseResult<${messageType.name}> {`);
		lines.push(` 	 	// Initialize execution context`);
		lines.push(` 	 	const context: ExecutionContext = {`);
		lines.push(` 	 	 	currentState: '${stateMachine.initialState}',`);
		lines.push(` 	 	 	offset,`);
		lines.push(` 	 	 	fields: new Map(),`);
		lines.push(` 	 	 	data,`);
		lines.push(` 	 	 	stateHistory: ['${stateMachine.initialState}'],`);
		lines.push(` 	 	 	completed: false,`);
		lines.push(` 	 	};`);
		lines.push(``);

		if (options.includeDebugLogging) {
			lines.push(` 	 	console.log('[Parser] Starting parse at offset', offset);`);
		}

		lines.push(` 	 	// Execute state machine`);
		lines.push(` 	 	while (!context.completed) {`);
		lines.push(` 	 	 	const state = this.getState(context.currentState);`);
		lines.push(``);
		lines.push(` 	 	 	if (!state) {`);
		lines.push(` 	 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	 	'Internal error: invalid state',`);
		lines.push(` 	 	 	 	 	context.currentState,`);
		lines.push(` 	 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	 	'valid state',`);
		lines.push(` 	 	 	 	 	context.currentState,`);
		lines.push(` 	 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	 	);`);
		lines.push(` 	 	 	}`);
		lines.push(``);

		if (options.includeDebugLogging) {
			lines.push(` 	 	 	console.log('[Parser] Current state:', state.name, 'at offset', context.offset);`);
		}

		lines.push(` 	 	 	// Execute state`);
		lines.push(` 	 	 	const result = this.executeState(state, context);`);
		lines.push(``);
		lines.push(` 	 	 	if (!result.success) {`);
		lines.push(` 	 	 	 	return result;`);
		lines.push(` 	 	 	}`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	// Build message from extracted fields`);
		lines.push(` 	 	const message: any = {};`);

		for (const field of messageType.fields) {
			lines.push(` 	 	if (context.fields.has('${field.name}')) {`);
			lines.push(` 	 	 	message.${field.name} = context.fields.get('${field.name}');`);
			if (field.required) {
				lines.push(` 	 	} else {`);
				lines.push(` 	 	 	return this.createError(`);
				lines.push(` 	 	 	 	'Required field ${field.name} not extracted',`);
				lines.push(` 	 	 	 	context.currentState,`);
				lines.push(` 	 	 	 	context.offset,`);
				lines.push(` 	 	 	 	'field ${field.name}',`);
				lines.push(` 	 	 	 	'missing',`);
				lines.push(` 	 	 	 	context.stateHistory`);
				lines.push(` 	 	 	);`);
			}
			lines.push(` 	 	}`);
		}

		lines.push(``);
		lines.push(` 	 	return {`);
		lines.push(` 	 	 	success: true,`);
		lines.push(` 	 	 	message: message as ${messageType.name},`);
		lines.push(` 	 	 	bytesConsumed: context.offset - offset,`);
		lines.push(` 	 	};`);
		lines.push(` 	}`);
		lines.push(``);

		// Generate executeState method
		lines.push(this.generateExecuteStateMethod(stateMachine, messageType, options));
		lines.push(``);

		// Generate getState method
		lines.push(this.generateGetStateMethod(stateMachine));
		lines.push(``);

		// Generate helper methods
		lines.push(this.generateHelperMethods(messageType));
		lines.push(``);
		lines.push(this.generateRemainingHelpers(options));
		lines.push(``);
		lines.push(this.generateUtilityMethods());
		lines.push(``);
		// FIX: Passed maxErrorLength here
		lines.push(this.generateConversionMethods(maxErrorLength));

		lines.push(`}`);

		return lines.join('\n');
	}

	/**
	 * Generate the executeState method
	 */
	private generateExecuteStateMethod(
		_stateMachine: StateMachine,
		_messageType: MessageType,
		_options: CodeGenOptions
	): string {
		const lines: string[] = [];

		lines.push(` 	/**`);
		lines.push(` 	 * Execute a single state`);
		lines.push(` 	 */`);
		lines.push(` 	private executeState(state: State, context: ExecutionContext): ParseResult<any> {`);
		lines.push(` 	 	switch (state.type) {`);

		// Generate case for each state type
		lines.push(` 	 	 	case 'INIT':`);
		lines.push(` 	 	 	 	return this.executeInitState(state, context);`);
		lines.push(``);

		lines.push(` 	 	 	case 'EXPECT_FIXED':`);
		lines.push(` 	 	 	 	return this.executeExpectFixedState(state, context);`);
		lines.push(``);

		lines.push(` 	 	 	case 'EXTRACT_FIELD':`);
		lines.push(` 	 	 	 	return this.executeExtractFieldState(state, context);`);
		lines.push(``);

		lines.push(` 	 	 	case 'EXPECT_DELIMITER':`);
		lines.push(` 	 	 	 	return this.executeExpectDelimiterState(state, context);`);
		lines.push(``);

		lines.push(` 	 	 	case 'OPTIONAL_FIELD':`);
		lines.push(` 	 	 	 	return this.executeOptionalFieldState(state, context);`);
		lines.push(``);

		lines.push(` 	 	 	case 'ACCEPT':`);
		lines.push(` 	 	 	 	context.completed = true;`);
		lines.push(` 	 	 	 	return { success: true, bytesConsumed: 0 };`);
		lines.push(``);

		lines.push(` 	 	 	case 'ERROR':`);
		lines.push(` 	 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	 	state.errorMessage || 'Parse error',`);
		lines.push(` 	 	 	 	 	state.id,`);
		lines.push(` 	 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	 	'valid input',`);
		lines.push(` 	 	 	 	 	this.getActualData(context.data, context.offset),`);
		lines.push(` 	 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	 	);`);
		lines.push(``);

		lines.push(` 	 	 	default:`);
		lines.push(` 	 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	 	'Unknown state type',`);
		lines.push(` 	 	 	 	 	state.id,`);
		lines.push(` 	 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	 	'known state type',`);
		lines.push(` 	 	 	 	 	state.type,`);
		lines.push(` 	 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	 	);`);
		lines.push(` 	 	}`);
		lines.push(` 	}`);

		return lines.join('\n');
	}

	/**
	 * Generate the getState method
	 */
	private generateGetStateMethod(stateMachine: StateMachine): string {
		const lines: string[] = [];

		lines.push(` 	/**`);
		lines.push(` 	 * Get state by ID`);
		lines.push(` 	 */`);
		lines.push(` 	private getState(stateId: string): State | null {`);
		lines.push(` 	 	const states: Record<string, State> = {`);

		for (const [stateId, state] of stateMachine.states) {
			lines.push(` 	 	 	'${stateId}': {`);
			lines.push(` 	 	 	 	id: '${state.id}',`);
			lines.push(` 	 	 	 	type: '${state.type}',`);
			lines.push(` 	 	 	 	name: ${JSON.stringify(state.name)},`);
			lines.push(` 	 	 	 	transitions: ${JSON.stringify(state.transitions)},`);
			lines.push(` 	 	 	 	isTerminal: ${state.isTerminal},`);

			if (state.action) {
				lines.push(` 	 	 	 	action: ${JSON.stringify(state.action)},`);
			}

			if (state.errorMessage) {
				lines.push(` 	 	 	 	errorMessage: ${JSON.stringify(state.errorMessage)},`);
			}

			if (state.metadata) {
				lines.push(` 	 	 	 	metadata: ${JSON.stringify(state.metadata)},`);
			}

			lines.push(` 	 	 	},`);
		}

		lines.push(` 	 	};`);
		lines.push(``);
		lines.push(` 	 	return states[stateId] || null;`);
		lines.push(` 	}`);

		return lines.join('\n');
	}

	/**
	 * Generate helper methods
	 */
	// FIX: Prefixed unused parameter with _
	private generateHelperMethods(_messageType: MessageType): string {
		const lines: string[] = [];

		// Generate state execution methods
		lines.push(` 	/**`);
		lines.push(` 	 * Execute INIT state`);
		lines.push(` 	 */`);
		lines.push(` 	private executeInitState(state: State, context: ExecutionContext): ParseResult<any> {`);
		lines.push(` 	 	// Transition to next state`);
		lines.push(` 	 	return this.transitionToNext(state, context);`);
		lines.push(` 	}`);
		lines.push(``);

		lines.push(` 	/**`);
		lines.push(` 	 * Execute EXPECT_FIXED state`);
		lines.push(` 	 */`);
		lines.push(` 	private executeExpectFixedState(state: State, context: ExecutionContext): ParseResult<any> {`);
		lines.push(` 	 	if (!state.action || !state.action.expected) {`);
		lines.push(` 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	'EXPECT_FIXED state missing expected value',`);
		lines.push(` 	 	 	 	state.id,`);
		lines.push(` 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	'expected value',`);
		lines.push(` 	 	 	 	'none',`);
		lines.push(` 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	);`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	const expected = state.action.expected as string;`);
		lines.push(` 	 	const expectedBuf = Buffer.from(expected, 'utf-8');`);
		lines.push(``);
		lines.push(` 	 	// Check if we have enough data`);
		lines.push(` 	 	if (context.offset + expectedBuf.length > context.data.length) {`);
		lines.push(` 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	'Unexpected end of data',`);
		lines.push(` 	 	 	 	state.id,`);
		lines.push(` 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	expected,`);
		lines.push(` 	 	 	 	this.getActualData(context.data, context.offset),`);
		lines.push(` 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	);`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	// Compare buffers`);
		lines.push(` 	 	if (context.data.compare(expectedBuf, 0, expectedBuf.length, context.offset, context.offset + expectedBuf.length) !== 0) {`);
		lines.push(` 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	\`Expected fixed string "\${expected}"\`,`);
		lines.push(` 	 	 	 	state.id,`);
		lines.push(` 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	expected,`);
		lines.push(` 	 	 	 	context.data.toString('utf-8', context.offset, Math.min(context.offset + expectedBuf.length, context.data.length)),`);
		lines.push(` 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	);`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	// Advance offset`);
		lines.push(` 	 	context.offset += expectedBuf.length;`);
		lines.push(``);
		lines.push(` 	 	// Transition to next state`);
		lines.push(` 	 	return this.transitionToNext(state, context);`);
		lines.push(` 	}`);
		lines.push(``);

		return lines.join('\n');
	}

	/**
	 * Generate remaining helper methods (continued)
	 */
	private generateRemainingHelpers(options: CodeGenOptions = {}): string {
		const lines: string[] = [];

		lines.push(` 	/**`);
		lines.push(` 	 * Execute EXPECT_DELIMITER state`);
		lines.push(` 	 */`);
		lines.push(` 	private executeExpectDelimiterState(state: State, context: ExecutionContext): ParseResult<any> {`);
		lines.push(` 	 	if (!state.action || !state.action.expected) {`);
		lines.push(` 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	'EXPECT_DELIMITER state missing expected delimiter',`);
		lines.push(` 	 	 	 	state.id,`);
		lines.push(` 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	'delimiter',`);
		lines.push(` 	 	 	 	'none',`);
		lines.push(` 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	);`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	const delimiter = state.action.expected as string;`);
		lines.push(` 	 	const delimiterBuf = Buffer.from(delimiter, 'utf-8');`);
		lines.push(``);
		lines.push(` 	 	// Check if delimiter matches`);
		lines.push(` 	 	if (context.offset + delimiterBuf.length > context.data.length) {`);
		lines.push(` 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	'Unexpected end of data',`);
		lines.push(` 	 	 	 	state.id,`);
		lines.push(` 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	delimiter,`);
		lines.push(` 	 	 	 	this.getActualData(context.data, context.offset),`);
		lines.push(` 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	);`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	if (context.data.compare(delimiterBuf, 0, delimiterBuf.length, context.offset, context.offset + delimiterBuf.length) !== 0) {`);
		lines.push(` 	 	 	return this.createError(`);
		lines.push(` 	 	 	 	\`Expected delimiter "\${delimiter}"\`,`);
		lines.push(` 	 	 	 	state.id,`);
		lines.push(` 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	delimiter,`);
		lines.push(` 	 	 	 	context.data.toString('utf-8', context.offset, Math.min(context.offset + delimiterBuf.length, context.data.length)),`);
		lines.push(` 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	);`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	// Advance offset`);
		lines.push(` 	 	context.offset += delimiterBuf.length;`);
		lines.push(``);
		lines.push(` 	 	// Transition to next state`);
		lines.push(` 	 	return this.transitionToNext(state, context);`);
		lines.push(` 	}`);
		lines.push(``);

		lines.push(` 	/**`);
		lines.push(` 	 * Execute OPTIONAL_FIELD state`);
		lines.push(` 	 */`);
		lines.push(` 	private executeOptionalFieldState(state: State, context: ExecutionContext): ParseResult<any> {`);
		lines.push(` 	 	// Try to extract the field, but don't fail if it's not present`);
		lines.push(` 	 	const fieldName = state.action?.target;`);
		lines.push(` 	 	if (!fieldName) {`);
		lines.push(` 	 	 	// Skip this state if no field name`);
		lines.push(` 	 	 	return this.transitionToNext(state, context);`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	// Try to find field end`);
		lines.push(` 	 	const endIndex = this.findFieldEnd(state, context);`);
		lines.push(``);

		if (options.includeDebugLogging) {
			lines.push(` 	 	console.log(\`[Parser] Optional field \${fieldName} range: \${context.offset} to \${endIndex}\`);`);
		}

		// FIX: ALLOW EMPTY STRING FIELDS.
		// If the field boundary was not found (endIndex === -1), skip the field.
		// But if endIndex === context.offset, it means we found the end immediately, implying an empty string. We KEEP that.
		lines.push(` 	 	if (endIndex === -1) {`);
		if (options.includeDebugLogging) {
			lines.push(` 	 	 	console.log(\`[Parser] Skipping optional field \${fieldName} (boundary not found)\`);`);
		}
		lines.push(` 	 	 	// Field boundary not found, skip it (i.e., field is not present)`);
		lines.push(` 	 	 	return this.transitionToNext(state, context);`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	// Extract and convert field value`);
		lines.push(` 	 	const rawValue = context.data.toString('utf-8', context.offset, endIndex);`);
		lines.push(` 	 	const fieldType = state.metadata?.fieldType || 'string';`);
		lines.push(` 	 	const convertedValue = this.convertFieldValue(rawValue, fieldType, fieldName, state.id, context);`);
		lines.push(``);
		lines.push(` 	 	if (!convertedValue.error) {`);
		lines.push(` 	 	 	context.fields.set(fieldName, convertedValue.value);`);
		lines.push(` 	 	 	context.offset = endIndex;`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	// Transition to next state`);
		lines.push(` 	 	return this.transitionToNext(state, context);`);
		lines.push(` 	}`);
		lines.push(``);

		return lines.join('\n');
	}

	private generateUtilityMethods(): string {
		const lines: string[] = [];

		lines.push(` 	/**`);
		lines.push(` 	 * Transition to the next state`);
		lines.push(` 	 */`);
		lines.push(` 	private transitionToNext(state: State, context: ExecutionContext): ParseResult<any> {`);
		lines.push(` 	 	// Find the first matching transition`);
		lines.push(` 	 	for (const transition of state.transitions) {`);
		lines.push(` 	 	 	if (this.evaluateTransitionCondition(transition.condition, context)) {`);
		lines.push(` 	 	 	 	context.currentState = transition.to;`);
		lines.push(` 	 	 	 	context.stateHistory.push(transition.to);`);
		lines.push(` 	 	 	 	return { success: true, bytesConsumed: 0 };`);
		lines.push(` 	 	 	}`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	// No matching transition found`);
		lines.push(` 	 	return this.createError(`);
		lines.push(` 	 	 	'No valid transition from current state',`);
		lines.push(` 	 	 	state.id,`);
		lines.push(` 	 	 	context.offset,`);
		lines.push(` 	 	 	'valid transition',`);
		lines.push(` 	 	 	'none',`);
		lines.push(` 	 	 	context.stateHistory`);
		lines.push(` 	 	);`);
		lines.push(` 	}`);
		lines.push(``);

		lines.push(` 	/**`);
		lines.push(` 	 * Evaluate a transition condition`);
		lines.push(` 	 */`);
		lines.push(` 	private evaluateTransitionCondition(condition: any, context: ExecutionContext): boolean {`);
		lines.push(` 	 	switch (condition.type) {`);
		lines.push(` 	 	 	case 'always':`);
		lines.push(` 	 	 	 	return true;`);
		lines.push(``);
		lines.push(` 	 	 	case 'on-match':`);
		lines.push(` 	 	 	 	if (!condition.matchValue) return false;`);
		lines.push(` 	 	 	 	const matchBuf = Buffer.from(condition.matchValue, 'utf-8');`);
		lines.push(` 	 	 	 	if (context.offset + matchBuf.length > context.data.length) return false;`);
		lines.push(` 	 	 	 	return context.data.compare(matchBuf, 0, matchBuf.length, context.offset, context.offset + matchBuf.length) === 0;`);
		lines.push(``);
		lines.push(` 	 	 	case 'on-delimiter':`);
		lines.push(` 	 	 	 	return true; // Delimiter already validated in EXPECT_DELIMITER state`);
		lines.push(``);
		lines.push(` 	 	 	case 'on-length':`);
		lines.push(` 	 	 	 	if (!condition.length) return false;`);
		lines.push(` 	 	 	 	return context.offset + condition.length <= context.data.length;`);
		lines.push(``);
		lines.push(` 	 	 	case 'on-optional':`);
		lines.push(` 	 	 	 	return true; // Optional fields always allow transition`);
		lines.push(``);
		lines.push(` 	 	 	default:`);
		lines.push(` 	 	 	 	return false;`);
		lines.push(` 	 	}`);
		lines.push(` 	}`);
		lines.push(` 	/**`);
		lines.push(` 	 * Find the end of a field value`);
		lines.push(` 	 */`);
		lines.push(` 	private findFieldEnd(state: State, context: ExecutionContext): number {`);
		lines.push(` 	 	// Look at the next state to determine what marks the end of this field`);
		lines.push(` 	 	if (state.transitions.length === 0) {`);
		lines.push(` 	 	 	// No transitions, use end of data`);
		lines.push(` 	 	 	return context.data.length;`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	const nextTransition = state.transitions[0];`);
		lines.push(` 	 	if (!nextTransition) return context.data.length;`);
		lines.push(``);
		lines.push(` 	 	const nextState = this.getState(nextTransition.to);`);
		lines.push(` 	 	if (!nextState) return context.data.length;`);
		lines.push(``);

		// FIX: Heuristic for detecting fields that run together without explicit delimiters (e.g. Gopher ItemType + Display)
		// If the current field has no delimiter, but the NEXT state expects a delimiter,
		// we should probably stop at that delimiter if we find it, rather than consuming everything.
		// However, the safest "dumb" default for unknown length is "scan for next likely delimiters"
		lines.push(` 	 	// Check what the next state expects`);
		lines.push(` 	 	if (nextState.type === 'EXPECT_FIXED' && nextState.action?.expected) {`);
		lines.push(` 	 	 	// Find the next fixed string`);
		lines.push(` 	 	 	const fixedStr = nextState.action.expected as string;`);
		lines.push(` 	 	 	const fixedBuf = Buffer.from(fixedStr, 'utf-8');`);
		lines.push(` 	 	 	const index = context.data.indexOf(fixedBuf, context.offset);`);
		lines.push(` 	 	 	return index === -1 ? -1 : index;`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	if (nextState.type === 'EXPECT_DELIMITER' && nextState.action?.expected) {`);
		lines.push(` 	 	 	// Find the next delimiter`);
		lines.push(` 	 	 	const delimiter = nextState.action.expected as string;`);
		lines.push(` 	 	 	const delimBuf = Buffer.from(delimiter, 'utf-8');`);
		lines.push(` 	 	 	const index = context.data.indexOf(delimBuf, context.offset);`);
		lines.push(` 	 	 	return index === -1 ? -1 : index;`);
		lines.push(` 	 	}`);
		lines.push(``);


		lines.push(` 	 	 if (nextState.type === 'OPTIONAL_FIELD' && nextState.metadata?.optionalPrefix) {`);
		lines.push(` 	 	 	 // Find the optional section marker (e.g., "[TIMEOUT:")`);
		lines.push(` 	 	 	 const optPrefix = '[' + nextState.metadata.optionalPrefix;`);
		lines.push(` 	 	 	 const optBuf = Buffer.from(optPrefix, 'utf-8');`);
		lines.push(` 	 	 	 const index = context.data.indexOf(optBuf, context.offset);`);
		lines.push(` 	 	 	 if (index !== -1) return index;`);
		lines.push(` 	 	 	 // If not found, continue to fallback scanning`);
		lines.push(` 	 	 }`);
		lines.push(``);
		// FIX: ADDED FALLBACK SCANNING
		// If we are here, the next state is NOT looking for a delimiter or fixed string. 
		// (e.g. ItemType -> Display).
		// In standard text protocols, we shouldn't consume newlines or tabs blindly if we are just an "Extract" state.
		// This scans for the first tab or newline and stops there to be safe.
		lines.push(`        // Fallback: Scan for common terminators (tab, CRLF) to prevent over-consumption`);
		lines.push(`        const nextTab = context.data.indexOf('\\t', context.offset);`);
		lines.push(` 	 	const nextCRLF = context.data.indexOf('\\r\\n', context.offset);`);
		lines.push(``);
		lines.push(` 	 	if (nextTab !== -1 && (nextCRLF === -1 || nextTab < nextCRLF)) return nextTab;`);
		lines.push(` 	 	if (nextCRLF !== -1) return nextCRLF;`);
		lines.push(``);
		lines.push(` 	 	// Default: use end of data`);
		lines.push(` 	 	return context.data.length;`);
		lines.push(` 	}`);
		lines.push(``);

		return lines.join('\n');
	}

	/**
	 * Generate field conversion and error handling methods
	 */
	// FIX: Added maxErrorLength parameter here to fix scope error
	private generateConversionMethods(maxErrorLength: number): string {
		const lines: string[] = [];

		lines.push(` 	/**`);
		lines.push(` 	 * Convert field value to appropriate type`);
		lines.push(` 	 */`);
		lines.push(` 	private convertFieldValue(`);
		lines.push(` 	 	rawValue: string,`);
		lines.push(` 	 	fieldType: string,`);
		lines.push(` 	 	fieldName: string,`);
		lines.push(` 	 	stateId: string,`);
		lines.push(` 	 	context: ExecutionContext`);
		lines.push(` 	): { value?: any; error?: ParseResult<any> } {`);
		lines.push(` 	 	switch (fieldType) {`);
		lines.push(` 	 	 	case 'string':`);
		lines.push(` 	 	 	 	return { value: rawValue };`);
		lines.push(``);
		lines.push(` 	 	 	case 'number': {`);
		lines.push(` 	 	 	 	const num = parseInt(rawValue, 10);`);
		lines.push(` 	 	 	 	// Note: Empty string is a common cause for isNaN. Protocols often define`);
		lines.push(` 	 	 	 	// numbers as optional if they can be empty. We allow NaN if not required.`);
		lines.push(` 	 	 	 	if (rawValue !== '' && isNaN(num)) {`);
		lines.push(` 	 	 	 	 	return {`);
		lines.push(` 	 	 	 	 	 	error: this.createError(`);
		lines.push(` 	 	 	 	 	 	 	\`Field "\${fieldName}" is not a valid number\`,`);
		lines.push(` 	 	 	 	 	 	 	stateId,`);
		lines.push(` 	 	 	 	 	 	 	context.offset,`);
		lines.push(` 	 	 	 	 	 	 	'number',`);
		lines.push(` 	 	 	 	 	 	 	rawValue,`);
		lines.push(` 	 	 	 	 	 	 	context.stateHistory`);
		lines.push(` 	 	 	 	 	 	),`);
		lines.push(` 	 	 	 	 	};`);
		lines.push(` 	 	 	 	}`);
		lines.push(` 	 	 	 	return { value: num };`);
		lines.push(` 	 	 	}`);
		lines.push(``);
		lines.push(` 	 	 	case 'boolean':`);
		lines.push(` 	 	 	 	return { value: rawValue === 'true' || rawValue === '1' };`);
		lines.push(``);
		lines.push(` 	 	 	case 'enum':`);
		lines.push(` 	 	 	 	// Enum validation should be done separately`);
		lines.push(` 	 	 	 	return { value: rawValue };`);
		lines.push(``);
		lines.push(` 	 	 	case 'bytes':`);
		lines.push(` 	 	 	 	return { value: Buffer.from(rawValue, 'utf-8') };`);
		lines.push(``);
		lines.push(` 	 	 	default:`);
		lines.push(` 	 	 	 	return { value: rawValue };`);
		lines.push(` 	 	}`);
		lines.push(` 	}`);
		lines.push(``);

		lines.push(` 	/**`);
		lines.push(` 	 * Get actual data for error messages (truncated)`);
		// FIX: Use maxErrorLength parameter instead of hardcoded 50
		lines.push(` 	 */`);
		lines.push(` 	private getActualData(data: Buffer, offset: number, maxLength: number = ${maxErrorLength}): string {`);
		lines.push(` 	 	const endOffset = Math.min(offset + maxLength, data.length);`);
		lines.push(` 	 	const actual = data.toString('utf-8', offset, endOffset);`);
		lines.push(` 	 	return actual.length < maxLength ? actual : actual + '...';`);
		lines.push(` 	}`);
		lines.push(``);

		lines.push(` 	/**`);
		lines.push(` 	 * Create an error result with detailed context`);
		lines.push(` 	 */`);
		lines.push(` 	private createError(`);
		lines.push(` 	 	message: string,`);
		lines.push(` 	 	state: string,`);
		lines.push(` 	 	offset: number,`);
		lines.push(` 	 	expected: string,`);
		lines.push(` 	 	actual: string,`);
		lines.push(` 	 	stateHistory: string[]`);
		lines.push(` 	): ParseResult<any> {`);
		lines.push(` 	 	return {`);
		lines.push(` 	 	 	success: false,`);
		lines.push(` 	 	 	error: {`);
		lines.push(` 	 	 	 	message,`);
		lines.push(` 	 	 	 	state,`);
		lines.push(` 	 	 	 	offset,`);
		lines.push(` 	 	 	 	expected,`);
		lines.push(` 	 	 	 	actual,`);
		lines.push(` 	 	 	 	stateHistory,`);
		lines.push(` 	 	 	},`);
		lines.push(` 	 	 	bytesConsumed: 0,`);
		lines.push(` 	 	};`);
		lines.push(` 	}`);
		lines.push(``);

		lines.push(` 	/**`);
		lines.push(` 	 * Evaluate a transition condition`);
		lines.push(` 	 */`);
		lines.push(` 	private evaluateTransitionCondition(condition: any, context: ExecutionContext): boolean {`);
		lines.push(` 	 	switch (condition.type) {`);
		lines.push(` 	 	 	case 'always':`);
		lines.push(` 	 	 	 	return true;`);
		lines.push(``);
		lines.push(` 	 	 	case 'on-match':`);
		lines.push(` 	 	 	 	if (!condition.matchValue) return false;`);
		lines.push(` 	 	 	 	const matchBuf = Buffer.from(condition.matchValue, 'utf-8');`);
		lines.push(` 	 	 	 	if (context.offset + matchBuf.length > context.data.length) return false;`);
		lines.push(` 	 	 	 	return context.data.compare(matchBuf, 0, matchBuf.length, context.offset, context.offset + matchBuf.length) === 0;`);
		lines.push(``);
		lines.push(` 	 	 	case 'on-delimiter':`);
		lines.push(` 	 	 	 	return true; // Delimiter already validated in EXPECT_DELIMITER state`);
		lines.push(``);
		lines.push(` 	 	 	case 'on-length':`);
		lines.push(` 	 	 	 	if (!condition.length) return false;`);
		lines.push(` 	 	 	 	return context.offset + condition.length <= context.data.length;`);
		lines.push(``);
		lines.push(` 	 	 	case 'on-optional':`);
		lines.push(` 	 	 	 	return true; // Optional fields always allow transition`);
		lines.push(``);
		lines.push(` 	 	 	default:`);
		lines.push(` 	 	 	 	return false;`);
		lines.push(` 	 	}`);
		lines.push(` 	}`);
		lines.push(` 	/**`);
		lines.push(` 	 * Find the end of a field value`);
		lines.push(` 	 */`);
		lines.push(` 	private findFieldEnd(state: State, context: ExecutionContext): number {`);
		lines.push(` 	 	// Look at the next state to determine what marks the end of this field`);
		lines.push(` 	 	if (state.transitions.length === 0) {`);
		lines.push(` 	 	 	// No transitions, use end of data`);
		lines.push(` 	 	 	return context.data.length;`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	const nextTransition = state.transitions[0];`);
		lines.push(` 	 	if (!nextTransition) return context.data.length;`);
		lines.push(``);
		lines.push(` 	 	const nextState = this.getState(nextTransition.to);`);
		lines.push(` 	 	if (!nextState) return context.data.length;`);
		lines.push(``);

		// FIX: Heuristic for detecting fields that run together without explicit delimiters (e.g. Gopher ItemType + Display)
		// If the current field has no delimiter, but the NEXT state expects a delimiter,
		// we should probably stop at that delimiter if we find it, rather than consuming everything.
		// However, the safest "dumb" default for unknown length is "scan for next likely delimiters"
		lines.push(` 	 	// Check what the next state expects`);
		lines.push(` 	 	if (nextState.type === 'EXPECT_FIXED' && nextState.action?.expected) {`);
		lines.push(` 	 	 	// Find the next fixed string`);
		lines.push(` 	 	 	const fixedStr = nextState.action.expected as string;`);
		lines.push(` 	 	 	const fixedBuf = Buffer.from(fixedStr, 'utf-8');`);
		lines.push(` 	 	 	const index = context.data.indexOf(fixedBuf, context.offset);`);
		lines.push(` 	 	 	return index === -1 ? -1 : index;`);
		lines.push(` 	 	}`);
		lines.push(``);
		lines.push(` 	 	if (nextState.type === 'EXPECT_DELIMITER' && nextState.action?.expected) {`);
		lines.push(` 	 	 	// Find the next delimiter`);
		lines.push(` 	 	 	const delimiter = nextState.action.expected as string;`);
		lines.push(` 	 	 	const delimBuf = Buffer.from(delimiter, 'utf-8');`);
		lines.push(` 	 	 	const index = context.data.indexOf(delimBuf, context.offset);`);
		lines.push(` 	 	 	return index === -1 ? -1 : index;`);
		lines.push(` 	 	}`);
		lines.push(``);

		// FIX: ADDED FALLBACK SCANNING
		// If we are here, the next state is NOT looking for a delimiter or fixed string. 
		// (e.g. ItemType -> Display).
		// In standard text protocols, we shouldn't consume newlines or tabs blindly if we are just an "Extract" state.
		// This scans for the first tab or newline and stops there to be safe.
		lines.push(`        // Fallback: Scan for common terminators (tab, CRLF) to prevent over-consumption`);
		lines.push(`        const nextTab = context.data.indexOf('\\t', context.offset);`);
		lines.push(` 	 	const nextCRLF = context.data.indexOf('\\r\\n', context.offset);`);
		lines.push(``);
		lines.push(` 	 	if (nextTab !== -1 && (nextCRLF === -1 || nextTab < nextCRLF)) return nextTab;`);
		lines.push(` 	 	if (nextCRLF !== -1) return nextCRLF;`);
		lines.push(``);
		lines.push(` 	 	// Default: use end of data`);
		lines.push(` 	 	return context.data.length;`);
		lines.push(` 	}`);
		lines.push(``);

		return lines.join('\n');
	}

}