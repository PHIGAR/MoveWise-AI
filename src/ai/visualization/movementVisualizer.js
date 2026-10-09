import {
    isValidMovementVisual
} from "../../core/movementVisual.js";


const CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
    [24, 26], [26, 28], [15, 17], [15, 19], [16, 18],
    [16, 20], [27, 29], [27, 31], [28, 30], [28, 32]
];

const EXERCISE_EMPHASIS = {
    "jumping-jack": {
        joints: [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28],
        trail: [15, 16, 27, 28],
        symmetry: true
    },
    squat: {
        joints: [23, 24, 25, 26, 27, 28],
        trail: [23, 24, 25, 26, 27, 28]
    },
    "push-up": {
        joints: [11, 12, 13, 14, 15, 16, 23, 24, 27, 28],
        trail: [15, 16, 23, 24, 27, 28]
    },
    lunge: {
        joints: [23, 24, 25, 26, 27, 28],
        trail: [23, 24, 25, 26, 27, 28]
    },
    "bicep-curl": {
        joints: [11, 12, 13, 14, 15, 16],
        trail: [15, 16]
    },
    "six-seven": {
        joints: [11, 12, 13, 14, 15, 16],
        trail: [15, 16]
    }
};

const SVG_NS = "http://www.w3.org/2000/svg";


export function getExerciseEmphasis(exerciseId) {
    return EXERCISE_EMPHASIS[exerciseId] || null;
}


export function renderMovementVisual(
    container,
    visual,
    exerciseId
) {
    if (
        !container ||
        !isValidMovementVisual(visual, exerciseId)
    ) {
        return false;
    }

    const emphasis = getExerciseEmphasis(exerciseId);
    const selectedRep = visual.reps[visual.reps.length - 1];
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 360 300");
    svg.setAttribute("role", "img");
    svg.setAttribute(
        "aria-label",
        `Movement skeleton and trail for ${exerciseId}`
    );
    svg.classList.add("movement-visual-svg");

    for (const rep of visual.reps) {
        renderTrail(
            svg,
            [...rep.trail, rep.representativePose],
            emphasis.trail
        );
    }

    if (emphasis.symmetry) {
        const axis = document.createElementNS(SVG_NS, "line");
        axis.setAttribute("x1", "180");
        axis.setAttribute("y1", "18");
        axis.setAttribute("x2", "180");
        axis.setAttribute("y2", "282");
        axis.classList.add("movement-symmetry-axis");
        svg.appendChild(axis);
    }

    CONNECTIONS.forEach(([from, to]) => {
        const first = getPoint(selectedRep.representativePose, from);
        const second = getPoint(selectedRep.representativePose, to);

        if (!first || !second) {
            return;
        }

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", toSvgX(first.x));
        line.setAttribute("y1", toSvgY(first.y));
        line.setAttribute("x2", toSvgX(second.x));
        line.setAttribute("y2", toSvgY(second.y));
        line.classList.add("movement-bone");
        if (
            emphasis.joints.includes(from) &&
            emphasis.joints.includes(to)
        ) {
            line.classList.add("is-emphasized");
        }
        svg.appendChild(line);
    });

    selectedRep.representativePose.forEach((point, index) => {
        if (!point || !emphasis.joints.includes(index)) {
            return;
        }

        const joint = document.createElementNS(SVG_NS, "circle");
        joint.setAttribute("cx", toSvgX(point.x));
        joint.setAttribute("cy", toSvgY(point.y));
        joint.setAttribute("r", "4.2");
        joint.classList.add("movement-joint");
        svg.appendChild(joint);
    });

    container.replaceChildren(svg);
    container.hidden = false;
    return true;
}


function renderTrail(svg, frames, joints) {
    const paths = new Map();

    frames.forEach(frame => {
        joints.forEach(index => {
            const point = getPoint(frame, index);

            if (!point) {
                return;
            }

            if (!paths.has(index)) {
                paths.set(index, []);
            }

            paths.get(index).push(point);
        });
    });

    paths.forEach(points => {
        if (points.length < 2) {
            return;
        }

        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute(
            "d",
            points.map((point, index) =>
                `${index === 0 ? "M" : "L"} ${toSvgX(point.x)} ${toSvgY(point.y)}`
            ).join(" ")
        );
        path.classList.add("movement-trail");
        svg.appendChild(path);
    });
}


function getPoint(pose, index) {
    return pose[index] || null;
}


function toSvgX(value) {
    return 24 + value * 312;
}


function toSvgY(value) {
    return 18 + value * 264;
}