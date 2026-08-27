/**
 * landmarkMap.js
 * 
 * Standard MediaPipe 468/478 Face Mesh landmark index constants.
 */

export const LANDMARKS = {
    // Vertical midline
    FOREHEAD_TOP: 10,
    FOREHEAD_MID: 151,
    NOSE_BRIDGE_TOP: 168,
    NOSE_BRIDGE_MID: 6,
    NOSE_TIP: 1,
    UPPER_LIP_TOP: 0,
    LOWER_LIP_BOTTOM: 17,
    CHIN_BOTTOM: 152,

    // Eyes
    LEFT_EYE_OUTER: 33,
    LEFT_EYE_INNER: 133,
    LEFT_EYE_TOP: 159,
    LEFT_EYE_BOTTOM: 145,
    LEFT_PUPIL: 468, // MediaPipe Iris refinement

    RIGHT_EYE_INNER: 362,
    RIGHT_EYE_OUTER: 263,
    RIGHT_EYE_TOP: 386,
    RIGHT_EYE_BOTTOM: 374,
    RIGHT_PUPIL: 473, // MediaPipe Iris refinement

    // Temples & Cheekbones (Width measurements)
    LEFT_TEMPLE: 127,
    RIGHT_TEMPLE: 356,
    LEFT_CHEEK_OUTER: 234,
    RIGHT_CHEEK_OUTER: 454,

    // Jawline
    LEFT_JAW_CORNER: 132,
    RIGHT_JAW_CORNER: 361,
    LEFT_JAW_MID: 58,
    RIGHT_JAW_MID: 288,
};
