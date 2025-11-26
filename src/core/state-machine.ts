/**
 * State Machine Representation for Protocol Parsing
 * 
 * This module defines the state machine types used for robust parser generation.
 * State machines provide explicit state transitions for handling complex format strings
 * with fixed strings, delimiters, optional fields, and field extraction.
 */

/**
 * State types in the parsing state machine
 */
export enum StateType {
  /** Initial state - entry point of the state machine */
  INIT = 'INIT',
  
  /** Expect and validate a fixed string at current position */
  EXPECT_FIXED = 'EXPECT_FIXED',
  
  /** Extract a field value from the input */
  EXTRACT_FIELD = 'EXTRACT_FIELD',
  
  /** Expect and validate a delimiter at current position */
  EXPECT_DELIMITER = 'EXPECT_DELIMITER',
  
  /** Handle an optional field (may or may not be present) */
  OPTIONAL_FIELD = 'OPTIONAL_FIELD',
  
  /** Accept state - parsing completed successfully */
  ACCEPT = 'ACCEPT',
  
  /** Error state - parsing failed */
  ERROR = 'ERROR',
}

/**
 * Action types that can be performed in a state
 */
export enum StateActionType {
  /** Validate that input matches expected value */
  VALIDATE = 'validate',
  
  /** Extract data from input into a field */
  EXTRACT = 'extract',
  
  /** Convert extracted data to target type */
  CONVERT = 'convert',
}

/**
 * Action to be performed in a state
 */
export interface StateAction {
  /** Type of action to perform */
  type: StateActionType;
  
  /** Target field name (for extract/convert actions) */
  target?: string;
  
  /** Expected value (for validate actions) */
  expected?: string | Buffer;
  
  /** Converter function name (for convert actions) */
  converter?: string;
  
  /** Additional metadata for the action */
  metadata?: Record<string, any>;
}

/**
 * Transition condition for moving between states
 */
export interface TransitionCondition {
  /** Type of condition */
  type: 'always' | 'on-match' | 'on-delimiter' | 'on-length' | 'on-optional';
  
  /** Value to match (for on-match conditions) */
  matchValue?: string | Buffer;
  
  /** Length to check (for on-length conditions) */
  length?: number;
  
  /** Whether the condition is negated */
  negate?: boolean;
}

/**
 * Transition between states
 */
export interface Transition {
  /** Source state ID */
  from: string;
  
  /** Destination state ID */
  to: string;
  
  /** Condition for this transition */
  condition: TransitionCondition;
  
  /** Action to perform during transition (optional) */
  action?: StateAction;
  
  /** Priority of this transition (higher = checked first) */
  priority?: number;
}

/**
 * State in the parsing state machine
 */
export interface State {
  /** Unique identifier for this state */
  id: string;
  
  /** Type of state */
  type: StateType;
  
  /** Human-readable name for debugging */
  name: string;
  
  /** Action to perform when entering this state */
  action?: StateAction;
  
  /** Outgoing transitions from this state */
  transitions: Transition[];
  
  /** Whether this is a terminal state (accept or error) */
  isTerminal: boolean;
  
  /** Error message if this is an error state */
  errorMessage?: string;
  
  /** Additional metadata for this state */
  metadata?: Record<string, any>;
}

/**
 * Complete state machine for parsing
 */
export interface StateMachine {
  /** All states in the machine */
  states: Map<string, State>;
  
  /** ID of the initial state */
  initialState: string;
  
  /** IDs of accept states */
  acceptStates: Set<string>;
  
  /** IDs of error states */
  errorStates: Set<string>;
  
  /** Name of the message type this machine parses */
  messageTypeName: string;
  
  /** Original format string */
  formatString: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * State machine execution context
 */
export interface ExecutionContext {
  /** Current state ID */
  currentState: string;
  
  /** Current byte offset in input */
  offset: number;
  
  /** Extracted field values */
  fields: Map<string, any>;
  
  /** Input data being parsed */
  data: Buffer;
  
  /** History of states visited (for debugging) */
  stateHistory: string[];
  
  /** Whether execution has completed */
  completed: boolean;
  
  /** Error information if execution failed */
  error?: {
    message: string;
    state: string;
    offset: number;
    expected: string;
    actual: string;
  };
}

/**
 * Result of state machine execution
 */
export interface ExecutionResult {
  /** Whether parsing succeeded */
  success: boolean;
  
  /** Extracted fields (if successful) */
  fields?: Map<string, any>;
  
  /** Number of bytes consumed */
  bytesConsumed: number;
  
  /** Error information (if failed) */
  error?: {
    message: string;
    state: string;
    offset: number;
    expected: string;
    actual: string;
    stateHistory: string[];
  };
}

/**
 * Builder for constructing state machines
 */
export class StateMachineBuilder {
  private states: Map<string, State> = new Map();
  private initialState: string | null = null;
  private acceptStates: Set<string> = new Set();
  private errorStates: Set<string> = new Set();
  private messageTypeName: string = '';
  private formatString: string = '';
  
  /**
   * Set the message type name
   */
  setMessageTypeName(name: string): this {
    this.messageTypeName = name;
    return this;
  }
  
  /**
   * Set the format string
   */
  setFormatString(format: string): this {
    this.formatString = format;
    return this;
  }
  
  /**
   * Add a state to the machine
   */
  addState(state: State): this {
    this.states.set(state.id, state);
    
    if (state.type === StateType.ACCEPT) {
      this.acceptStates.add(state.id);
    } else if (state.type === StateType.ERROR) {
      this.errorStates.add(state.id);
    }
    
    return this;
  }
  
  /**
   * Set the initial state
   */
  setInitialState(stateId: string): this {
    if (!this.states.has(stateId)) {
      throw new Error(`Cannot set initial state: state ${stateId} does not exist`);
    }
    this.initialState = stateId;
    return this;
  }
  
  /**
   * Add a transition between states
   */
  addTransition(transition: Transition): this {
    const fromState = this.states.get(transition.from);
    if (!fromState) {
      throw new Error(`Cannot add transition: source state ${transition.from} does not exist`);
    }
    
    if (!this.states.has(transition.to)) {
      throw new Error(`Cannot add transition: destination state ${transition.to} does not exist`);
    }
    
    fromState.transitions.push(transition);
    
    // Sort transitions by priority (higher priority first)
    fromState.transitions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    return this;
  }
  
  /**
   * Build the state machine
   */
  build(): StateMachine {
    if (!this.initialState) {
      throw new Error('Cannot build state machine: no initial state set');
    }
    
    if (this.acceptStates.size === 0) {
      throw new Error('Cannot build state machine: no accept states defined');
    }
    
    // Validate that all states are reachable
    this.validateReachability();
    
    // Validate that there are no ambiguous transitions
    this.validateTransitions();
    
    return {
      states: new Map(this.states),
      initialState: this.initialState,
      acceptStates: new Set(this.acceptStates),
      errorStates: new Set(this.errorStates),
      messageTypeName: this.messageTypeName,
      formatString: this.formatString,
    };
  }
  
  /**
   * Validate that all states are reachable from the initial state
   */
  private validateReachability(): void {
    const reachable = new Set<string>();
    const queue: string[] = [this.initialState!];
    
    while (queue.length > 0) {
      const stateId = queue.shift()!;
      if (reachable.has(stateId)) {
        continue;
      }
      
      reachable.add(stateId);
      
      const state = this.states.get(stateId);
      if (state) {
        for (const transition of state.transitions) {
          if (!reachable.has(transition.to)) {
            queue.push(transition.to);
          }
        }
      }
    }
    
    // Check for unreachable states
    for (const stateId of this.states.keys()) {
      if (!reachable.has(stateId)) {
        console.warn(`Warning: State ${stateId} is unreachable from initial state`);
      }
    }
  }
  
  /**
   * Validate that there are no ambiguous transitions
   */
  private validateTransitions(): void {
    for (const [stateId, state] of this.states) {
      // Check for multiple 'always' transitions
      const alwaysTransitions = state.transitions.filter(
        t => t.condition.type === 'always'
      );
      
      if (alwaysTransitions.length > 1) {
        throw new Error(
          `State ${stateId} has multiple 'always' transitions, which is ambiguous`
        );
      }
      
      // If there's an 'always' transition, it should be the only transition
      if (alwaysTransitions.length === 1 && state.transitions.length > 1) {
        console.warn(
          `Warning: State ${stateId} has an 'always' transition along with other transitions. ` +
          `The 'always' transition will always be taken.`
        );
      }
    }
  }
}

/**
 * Helper function to create a simple state
 */
export function createState(
  id: string,
  type: StateType,
  name: string,
  options: {
    action?: StateAction;
    isTerminal?: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  } = {}
): State {
  return {
    id,
    type,
    name,
    action: options.action,
    transitions: [],
    isTerminal: options.isTerminal || type === StateType.ACCEPT || type === StateType.ERROR,
    errorMessage: options.errorMessage,
    metadata: options.metadata,
  };
}

/**
 * Helper function to create a transition
 */
export function createTransition(
  from: string,
  to: string,
  condition: TransitionCondition,
  options: {
    action?: StateAction;
    priority?: number;
  } = {}
): Transition {
  return {
    from,
    to,
    condition,
    action: options.action,
    priority: options.priority,
  };
}
