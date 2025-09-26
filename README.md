> Open this page at [https://detach8.github.io/pxt-maqueen-plus-v2-line-follower/](https://detach8.github.io/pxt-maqueen-plus-v2-line-follower/)

# Line Follower for Maqueen Plus V2

This is a basic line follower for the DFRobot Maqueen Plus V2 which does not have the built-in PID
line follower like the Maqueen V3.

Line following termination modes:
* Junction: When two outer sensors detect a line (T or X junction)
* Junction: When middle and left outer sensor detect a line (Left junction)
* Junction: When middle and right outer sensor detect a line (Right junction)
* Lost track: When all front sensors loses track of a line
* Ultrasonic: When ultrasonic sensor detects obstacle within minimum distance

Turn termination modes:
* Outer sensor detection off: When all front sensors detect a line and the
  inside sensor passes it
* Outer sensor detection on: When the near-side outer sensor (L2/R2), then all
  front sensors detect a line and the inside sensor passes it

Additional features:
* Move forward for fixed duration - useful for positioning before a turn
* Read and display line sensor state using the first row of micro:bit LED

Author: Justin Lee <tzlee@tzlee.com>

## Usage

You will need initialise I2C of the Maqueen Plus V2 via the Maqueen Plus V2
extension in your start block.

    maqueenPlusV2.I2CInit()

After initialising, it is recommend to set the parameters of the line follower
and the ultrasonic sensor (if you're using it).

    // This is the default speed for a slow but accurate line following
    mp2LineFollower.setSpeedParameters(20, 28, 0, 32)

    // These are the default ultrasonic pins for Maqueen Plus V2, with a 5 cm
    // obstacle detection
    mp2LineFollower.setUltrasonicParameters(DigitalPin.P13, DigitalPin.P14, 5)

In addition, you might want to turn on the LEDs at the bottom of the robot to
illuminate the floor for more consistency.

    // Turn on white LEDs at the bottom
    maqueenPlusV2.showColor(DigitalPin.P15, maqueenPlusV2.colors(maqueenPlusV2.NeoPixelColors.White))

You can assign a button to start line following mode, e.g.

    // Press the A button to start line following with ultrasonic detection
    input.onButtonPressed(Button.A, function () {
        mp2LineFollower.doLineFollowing(mp2LineFollower.LineFollowingMode.None, true)
    })

For debugging, you can use your forever loop to display the sensor status on
the first row of LEDs of your micro:bit.

    basic.forever(function () {
        mp2LineFollower.sensorDisplay()
    })

Here's an example if you want the robot to turn left only at the 3rd junction:

    // Do line following to stop a junction, disable ultrasonic detection
    mp2LineFollower.doLineFollowing(mp2LineFollower.LineFollowingMode.Junction, false)

    // Robot stops at 1st junction
    // Move the robot forward for 1000ms to go past the junction
    mp2LineFollower.moveForward(1000)

    // Do line following to stop a junction, disable ultrasonic detection
    mp2LineFollower.doLineFollowing(mp2LineFollower.LineFollowingMode.Junction, false)

    // Robot stops at 2nd junction
    // Move the robot forward for 1000ms to go past the junction
    mp2LineFollower.moveForward(1000)

    // Do line following to stop a junction, disable ultrasonic detection
    mp2LineFollower.doLineFollowing(mp2LineFollower.LineFollowingMode.Junction, false)
    
    // Robot stops at 3rd Junction
    // Move the robot forward for 600ms to center robot rotation axis on junction
    mp2LineFollower.moveForward(600)    

    // Turn left
    mp2LineFollower.turn(mp2LineFollower.TurnDirection.Left)

    // Continue line following...
    mp2LineFollower.doLineFollowing(mp2LineFollower.LineFollowingMode.Junction, false)

    // etc.

### setSpeedParameters(forwardSpeed: number, yawFastSpeed: number, yawSlowSpeed: number, turnSpeed: number)

Sets the line following motor speed parameters.
* `forwardSpeed`: Speed of both motors when robot is moving straight
* `yawFastSpeed`: Speed of the faster motor when robot is yawing to stay on track
* `yawSlowSpeed`: Speed of the faster motor when robot is yawing to stay on track
* `turnSpeed`: Speed of the motors when robot is turning (both motors turn in
  opposing direction)

### setUltrasonicParameters(trigPin: DigitalPin, echoPin: DigitalPin, distance: number)

Sets the ultrasonic detection parameters.
* `trigPin`: Trigger pin (default `DigitalPin.P13`)
* `echoPin`: Echo pin (default `DigitalPin.P14`)
* `distance`: Distance to stop line following (in cm)

### sensorDisplay() 

Read and display the sensor status on the *first row of LEDs* on the micro:bit.
You can add this to your forever loop to aid debugging.

### abortLineFollowing()

Stops the line following or turn (doesn't work very well)

### doLineFollowing(mode: LineFollowingMode, ultrasonic: boolean = false)

The `ultrasonic` parameter enables/disables the ultrasonic sensor detection.
If `ultrasonic` is set to `true`, then an ultrasonic obstacle will *always*
stop the robot even if a junction is not yet detected.

Use `setUltrasonicParameters(...)` to configure the stop distance.

Performs line following using the following modes:
* `LineFollowingMode.Junction`: When a junction is detected.
* `LineFollowingMode.LostTrack`: When the front sensors loses track of a line.
* `LineFollowingMode.JunctionOrLostTrack`: When a junction is detected, or when the front sensors loses track of a line.
* `LineFollowingMode.None`: No junction detection.

A junction is considered detected if one of the following conditions are true:
* Both outer (L2 and R2) sensors detect a line (T or X junction)
* One of the outer (L2 or R2) and middle (M) sensors detect a line (R or L junction)

Note: This is a blocking function, i.e. if you place a command after this, the
next command will only run after a junction or obstacle is detected and ends
the line follower.

### turn(direction: TurnDirection, outerDetection: boolean = false)

Turn the robot toward `direction`:
* `TurnDirection.Left`: Turn left
* `TurnDirection.Right`: Turn right

A turn terminates when all the front sensors (L1, M, R1) has seen a line *and*
the inside sensor (i.e. L1 in a left turn, R1 in a right turn) falls off the
line. This ensures that the robot has made the turn and crossed the line
completely.

If `outerDetection` is set to `true`, then the inside outer sensor (i.e. L2 in
a left turn, R2 in a right turn) must see a line *before* the front sensors
detect the destination line. This is sometimes useful if the front sensors are
in an area that might trip the sensors during a turn. By enabling this mode and
moving the robot forward a little bit before executing the turn, the robot may
have turned enough to move the front sensors out of the way.

### moveForward(milliseconds: number)

Move the robot forward for a duration of `milliseconds` ms (1 second = 1000 ms).
This uses the `forwardSpeed` configured using `setSpeedParameters(...)`.

This is a simple move command with no detection. Useful for adjusting the robot
so it avoids tripping sensors.

### moveBackward(milliseconds: number)

Move the robot backward for a duration of `milliseconds` ms (1 second = 1000 ms).
This uses the `forwardSpeed` configured using `setSpeedParameters(...)`.

This is a simple move command with no detection. Useful for adjusting the robot
so it avoids tripping sensors.

### rotate(direction: TurnDirection, milliseconds: number)

Turn the robot toward `direction` for a duration of `milliseconds` ms
(1 second = 1000 ms). This uses the `turnSpeed` configured using
`setSpeedParameters(...)`.

This is a simple turn command with no detection. Useful for adjusting the robot
so it avoids tripping sensors.

## Tips

The Maqueen V2 motor is rather inconsistent especially at low speeds. Weight,
drag, and any other physical load affects the motor performance significantly.

In my testing, speed values below 16 doesn't move the robot. Speed values below
20 are very inconsistent.

Suggestions (untested): You may opt to replace the default motor (1:150 ratio)
to a higher ratio (i.e. slower) motor, e.g. 1:300 (~50 rpm @ 6V)

## Use as Extension

This repository can be added as an **extension** in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* click on **New Project**
* click on **Extensions** under the gearwheel menu
* search for **https://github.com/detach8/pxt-maqueen-plus-v2-line-follower**
  and import

## Edit this project

To edit this repository in MakeCode.

* open [https://makecode.microbit.org/](https://makecode.microbit.org/)
* connect your MakeCode to GitHub using the GitHub icon at the bottom
* clone this repository to your own github account
* in MakeCode, click on **Import** then click on **Import URL**
* paste **your github repository link** to import

#### Metadata (used for search, rendering)

* for PXT/microbit
<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
