/**
 * Line Follower Extension for the Maqueen Plus V2
 * This extension depends on the DFRobot_MaqueenPlus_v20 extension
 * Author: tzlee@tzlee.com
 */

//% weight=100 color=#0fbc11 icon="\uf067" block="Line Follower for Maqueen Plus V2"
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
        Left,
        Right,
    }

    export enum LineFollowingMode {
        //% block="junction detected on L2 or R2 sensors"
        Junction,
        //% block="lost track at M sensor"
        LostTrack,
        //% block="junction detected or lost track"
        JunctionOrLostTrack,
        //% block="unconditionally or until ultrasonic obstacle detected"
        None,
    }

    export enum TurnDirection {
        //% block="left"
        Left,
        //% block="right"
        Right,
    }

    //% block="set line following speed parameters | forward %forwardSpeed yaw fast %yawFastSpeed slow %yawSlowSpeed turn %turnSpeed"
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

    //% block="set PID parameters | Kp %kp Ki %ki Kd %kd"
    export function setPIDParameters(kp: number, ki: number, kd: number) {
        // TODO
    }

    //% block="set ultrasonic detection parameters | trig pin %trigPin echo pin %echoPin distance (cm) %distace"
    //% trigPin.defl=DigitalPin.P13
    //% echoPin.defl=DigitalPin.P14
    //% distance.min=0 distance.defl=5
    export function setUltrasonicParameters(trigPin: DigitalPin, echoPin: DigitalPin, distance: number) {
        _ultrasonicTrigPin = trigPin;
        _ultrasonicEchoPin = echoPin;
        _ultrasonicDistance = distance;
    }

    //% block="read and display line sensor state on last row of LEDs"
    export function sensorDisplay() {
        _sensorDisplayArray([
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR2),
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR1),
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorM),
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL1),
            maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL2),
        ]);
    }

    //% block="abort line following"
    export function abortLineFollowing() {
        // TODO: Doesn't work well, need other ways to terminate the infinite loop
        _running = false;
    }

    //% block="do line following | until %mode | with ultrasonic enabled %ultrasonic"
    export function doLineFollowing(mode: LineFollowingMode, ultrasonic: boolean) {
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

    //% block="turn %direction | of at least (degees) %minDegrees | and at most (degrees) %maxDegrees"
    //% minDegrees.min=0 minDegrees.max=360 minDegrees.defl=30
    //% maxDegrees.min=0 maxDegrees.max=360 maxDegrees.defl=150
    export function turn(direction: TurnDirection, minDegrees: number, maxDegrees: number) {
        let l1: boolean = false;
        let r1: boolean = false;
        let m: boolean = false;
        let h: number = input.compassHeading(); // Initial compass heading

        // Start motor
        _controlMotorTurn(direction);
        _running = true;

        // Turn until the outer sensors see the line first
        /*
        while (_running) {
            sensorDisplaySingle()
            if (direction == TurnDirection.Left &&
                maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL2) == 1) {
                break
            } else if (direction == TurnDirection.Right &&
                maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR2) == 1) {
                break
            }
        }
        */

        // Turn until all 3 front sensors have seen the line
        while (_running) {
            sensorDisplay();

            if (_headingChange(h) < minDegrees) continue;

            if (maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorM) == 1) m = true;
            if (maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL1) == 1) l1 = true;
            if (maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR1) == 1) r1 = true;
            
            if (l1 && r1 && m) break;
        }

        // Continue turning until edge sensor falls off the line
        while ((_running = true)) {
            sensorDisplay();

            if (_headingChange(h) > maxDegrees) break;

            if (direction == TurnDirection.Left && maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorL1) == 0) break;
            else if (direction == TurnDirection.Right && maqueenPlusV2.readLineSensorState(maqueenPlusV2.MyEnumLineSensor.SensorR1) == 0) break;
        }

        _controlMotorStop();
    }

    //% block="move forward | for (ms) %milliseconds"
    //% milliseconds.defl=600
    export function moveForward(milliseconds: number) {
        _controlMotorLine(LineFollowingState.Straight);
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
            default:
                maqueenPlusV2.controlMotor(maqueenPlusV2.MyEnumMotor.AllMotor, maqueenPlusV2.MyEnumDir.Forward, _forwardSpeed);
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
        let y = [4, 4, 4, 4, 4];
        for (let i = 0; i < 5; i++) {
            if (values[i]) led.plot(x[i], y[i]);
            else led.unplot(x[i], y[i]);
        }
    }

    // Calculate heading change
    function _headingChange(initialHeading: number) {
        let x = (input.compassHeading() - initialHeading) % 360;
        if (x > 0) return x;
        return 0 - x;
    }
}
