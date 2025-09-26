/**
 * Line Follower Extension for the Maqueen Plus V2
 * This extension depends on the DFRobot_MaqueenPlus_v20 extension
 * Author: tzlee@tzlee.com
 */

//% weight=100 color=#0fbc11 icon="\uf067" block="Line Follower for Maqueen Plus V2"
//% help=github:detach8/pxt-maqueen-plus-v2-line-follower
namespace mp2LineFollower {
    let _running: boolean = false;
    let _forwardSpeed: number = 20;
    let _yawFastSpeed: number = 28;
    let _yawSlowSpeed: number = 0;
    let _turnSpeed: number = 32;
    let _ultrasonicTrigPin: DigitalPin;
    let _ultrasonicEchoPin: DigitalPin;
    let _ultrasonicDistance: number = 5;

    enum LineFollowingState {
        Stop,
        Straight,
        Reverse,
        Left,
        Right,
    }

    export enum LineFollowingMode {
        //% block="junction detected only"
        Junction,
        //% block="lost track only"
        LostTrack,
        //% block="junction detected, or lost track"
        JunctionOrLostTrack,
        //% block="unconditionally, or until ultrasonic obstacle detected"
        None,
    }

    export enum TurnDirection {
        //% block="left"
        Left,
        //% block="right"
        Right,
    }

    /** 
     * Sets the line following motor speed parameters.
     * @param forwardSpeed Speed of both motors when robot is moving straight
     * @param yawFastSpeed Speed of the faster motor when robot is yawing to stay on track
     * @param yawSlowSpeed Speed of the faster motor when robot is yawing to stay on track
     * @param turnSpeed Speed of the motors when robot is turning (both motors turn in opposing direction)
     */
    //% block="set line following speed parameters | forward %forwardSpeed yaw fast %yawFastSpeed yaw slow %yawSlowSpeed turn %turnSpeed"
    //% inlineInputMode=external
    //% forwardSpeed.min=0 forwardSpeed.max=255 forwardSpeed.defl=20
    //% yawFastSpeed.min=0 yawFastSpeed.max=255 yawFastSpeed.defl=28
    //% yawSlowSpeed.min=0 yawSlowSpeed.max=255 yawSlowSpeed.defl=0
    //% turnSpeed.min=0 turnSpeed.max=255 turnSpeed.defl=32
    export function setSpeedParameters(forwardSpeed: number, yawFastSpeed: number, yawSlowSpeed: number, turnSpeed: number) {
        _forwardSpeed = forwardSpeed;
        _yawFastSpeed = yawFastSpeed;
        _yawSlowSpeed = yawSlowSpeed;
        _turnSpeed = turnSpeed;
    }

    /**
     * Sets the ultrasonic detection parameters.
     * @param trigPin Trigger pin (default DigitalPin.P13)
     * @param echoPin Echo pin (default DigitalPin.P14)
     * @param distance Distance to stop line following (in cm)
     */
    //% block="set ultrasonic detection parameters | trig pin %trigPin echo pin %echoPin distance (cm) %distance"
    //% inlineInputMode=external
    //% trigPin.defl=DigitalPin.P13
    //% echoPin.defl=DigitalPin.P14
    //% distance.min=0 distance.defl=5
    export function setUltrasonicParameters(trigPin: DigitalPin, echoPin: DigitalPin, distance: number) {
        _ultrasonicTrigPin = trigPin;
        _ultrasonicEchoPin = echoPin;
        _ultrasonicDistance = distance;
    }

    /**
     * Read and display the sensor status on the first row of LEDs on the micro:bit.
     * You can add this to your forever loop to aid debugging.
     */
    //% block="read and display line sensor state on first row of LEDs"
    export function sensorDisplay() {
        _sensorDisplayArray([
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR2),
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR1),
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorM),
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL1),
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL2),
        ]);
    }

    /**
     * Stops the line following or turn
     */
    //% block="abort line following"
    export function abortLineFollowing() {
        // TODO: Doesn't work well, need other ways to terminate the infinite loop
        _running = false;
    }

    /**
     * Performs line following using various termination modes.
     * If ultrasonic detection is set to true, then an ultrasonic obstacle will always stop the robot even if a junction is not yet detected.
     * See https://detach8.github.io/pxt-maqueen-plus-v2-line-follower/ for more information.
     */
    //% block="do line following until %mode || with ultrasonic detection enabled %ultrasonic"
    //% ultrasonic.defl=false
    export function doLineFollowing(mode: LineFollowingMode, ultrasonic: boolean = false) {
        let state: LineFollowingState = LineFollowingState.Straight;
        let lastState: LineFollowingState = LineFollowingState.Stop;

        // Start motor
        _controlMotorLine(LineFollowingState.Straight);
        _running = true;

        while (_running) {
            // Note: 1 == black, 0 == white
            let m = maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorM);
            let l1 = maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL1);
            let r1 = maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR1);
            let l2 = maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL2);
            let r2 = maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR2);
            _sensorDisplayArray([r2, r1, m, l1, l2]);

            // Junction detection
            let tJunction = l2 == 1 && r2 == 1;
            let lJunction = l2 == 1 && m == 1;
            let rJunction = r2 == 1 && m == 1;

            // Minimum ultrasonic distance reached
            if (ultrasonic && maqueenPlusV2.readUltrasonic(_ultrasonicTrigPin, _ultrasonicEchoPin) <= _ultrasonicDistance) {
                state = LineFollowingState.Stop;
                break;
            }

            // At junction
            else if ((tJunction || lJunction || rJunction) && (mode == LineFollowingMode.Junction || mode == LineFollowingMode.JunctionOrLostTrack)) {
                state = LineFollowingState.Stop;
                break;
            }

            // Lost track front
            else if (m == 0 && mode == (LineFollowingMode.LostTrack || mode == LineFollowingMode.JunctionOrLostTrack)) {
                state = LineFollowingState.Stop;
                break;
            }

            // Line tracking
            else if (l1 == 1 && r1 == 0) {
                state = LineFollowingState.Left;
            } else if (l1 == 0 && r1 == 1) {
                state = LineFollowingState.Right;
            } else {
                state = LineFollowingState.Straight;
            }

            // Don't keep sending motor commands, only send when state changes
            if (state != lastState) {
                lastState = state;
                _controlMotorLine(state);
            }
        }

        _controlMotorStop();
    }

    /**
     * Turn the robot until a line is deteced. The front sensors are used to detect the destination line.
     * If outerDetection is set to true, then the inside outer sensor (i.e. L2 in a left turn, R2 in a right turn) must see a line before the front sensors detect the destination line.
     * See https://detach8.github.io/pxt-maqueen-plus-v2-line-follower/ for more information.
     */
    //% block="turn %direction until line is detected || with outer sensor detection enabled %outerDetection"
    //% outerDetection.defl=false
    export function turn(direction: TurnDirection, outerDetection: boolean = false) {
        let l1: boolean = false;
        let r1: boolean = false;
        let m: boolean = false;

        // Start motor
        _controlMotorTurn(direction);
        _running = true;

        // Turn until the outer sensors see the line first
        while (_running && outerDetection) {
            sensorDisplay();

            if (direction == TurnDirection.Left && maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL2) == 1) {
                break;
            } else if (direction == TurnDirection.Right && maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR2) == 1) {
                break;
            }
        }

        // Turn until all 3 front sensors have seen the line
        while (_running) {
            sensorDisplay();

            if (maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorM) == 1) m = true;
            if (maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL1) == 1) l1 = true;
            if (maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR1) == 1) r1 = true;

            if (l1 && r1 && m) break;
        }

        // Continue turning until edge sensor falls off the line
        while (_running) {
            sensorDisplay();
            if (direction == TurnDirection.Left && maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL1) == 0) break;
            else if (direction == TurnDirection.Right && maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR1) == 0) break;
        }

        _controlMotorStop();
    }

    /**
     * Move the robot forward for a duration of milliseconds ms (1 second = 1000 ms) using the configured forward speed.
     */
    //% block="move forward for (ms) %milliseconds"
    //% milliseconds.defl=600
    export function moveForward(milliseconds: number) {
        _controlMotorLine(LineFollowingState.Straight);
        basic.pause(milliseconds);
        _controlMotorStop();
    }

    /**
     * Move the robot backward for a duration of milliseconds ms (1 second = 1000 ms) using the configured forward speed.
     */
    //% block="move backward for (ms) %milliseconds"
    //% milliseconds.defl=600
    export function moveBackward(milliseconds: number) {
        _controlMotorLine(LineFollowingState.Reverse);
        basic.pause(milliseconds);
        _controlMotorStop();
    }

    /**
     * Turn the robot toward direction for a duration of milliseconds ms (1 second = 1000 ms) using the configured turn speed.
     */
    //% block="rotate robot in %direction for (ms) %milliseconds"
    //% milliseconds.defl=1000
    export function rotate(direction: TurnDirection, milliseconds: number) {
        _controlMotorTurn(direction);
        basic.pause(milliseconds);
        _controlMotorStop();
    }

    // Internal function to send motor control commands
    function _controlMotorLine(state: LineFollowingState) {
        switch (state) {
            case LineFollowingState.Left:
                maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, _yawSlowSpeed);
                maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, _yawFastSpeed);
                break;
            case LineFollowingState.Right:
                maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, _yawSlowSpeed);
                maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, _yawFastSpeed);
                break;
            case LineFollowingState.Straight:
                maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.AllMotor, maqueenPlusV2.MyEnumDir.Forward, _forwardSpeed);
                break;
            case LineFollowingState.Reverse:
                maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.AllMotor, maqueenPlusV2.MyEnumDir.Backward, _forwardSpeed);
                break;
            default:
                _controlMotorStop();
        }
    }

    // Internal function to send motor control commands
    function _controlMotorTurn(direction: TurnDirection) {
        if (direction == TurnDirection.Right) {
            // Right
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Backward, _turnSpeed);
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Forward, _turnSpeed);
        } else {
            // Left
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.LeftMotor, maqueenPlusV2.MyEnumDir.Backward, _turnSpeed);
            maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.RightMotor, maqueenPlusV2.MyEnumDir.Forward, _turnSpeed);
        }
    }

    // Internal function to send motor control commands
    function _controlMotorStop() {
        maqueenPlusV2.controlMotorStop(maqueenPlusV2.MyEnumMotor.AllMotor);
    }

    // Internal function to plot sensor states to LED
    function _sensorDisplayArray(values: Array<number>) {
        // Note: 1 == black, 0 == white
        let x = [0, 1, 2, 3, 4];
        let y = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) {
            if (values[i]) led.plot(x[i], y[i]);
            else led.unplot(x[i], y[i]);
        }
    }
}
