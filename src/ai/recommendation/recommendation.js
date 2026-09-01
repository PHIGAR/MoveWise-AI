const TREND_TOLERANCE = 1;


function metricValue(session, key) {
    return typeof session?.[key] === "number"
        ? session[key]
        : null;
}


function getTrend(currentSession, history) {
    const qualityHistory = history
        .map(session => metricValue(session, "quality"))
        .filter(value => value !== null);

    const currentQuality = metricValue(currentSession, "quality");

    if (
        currentQuality === null ||
        qualityHistory.length < 2
    ) {
        return {
            improving: false,
            direction: "stable",
            status: "insufficient-data"
        };
    }

    const previousQuality =
        qualityHistory[qualityHistory.length - 1];
    const difference = currentQuality - previousQuality;

    const direction =
        difference > TREND_TOLERANCE
            ? "up"
            : difference < -TREND_TOLERANCE
                ? "down"
                : "stable";

    return {
        improving: direction === "up",
        direction,
        status: "available",
        difference
    };
}


function addFocus(
    focusAreas,
    type,
    severity,
    title,
    message
) {
    focusAreas.push({
        type,
        severity,
        title,
        message
    });
}


export function generateRecommendation(
    currentSession,
    history = []
) {
    if (!currentSession) {
        return {
            summary: "ยังมีข้อมูลไม่เพียงพอสำหรับวิเคราะห์พัฒนาการ",
            priority: null,
            recommendations: [],
            strengths: [],
            focusAreas: [],
            trend: {
                improving: false,
                direction: "stable",
                status: "insufficient-data"
            }
        };
    }

    const quality = metricValue(currentSession, "quality");
    const accuracy = metricValue(currentSession, "accuracy");
    const symmetry = metricValue(currentSession, "symmetry");
    const armROM = metricValue(currentSession, "armROM");
    const legROM = metricValue(currentSession, "legROM");
    const consistency = metricValue(currentSession, "consistency");
    const trend = getTrend(currentSession, history);
    const strengths = [];
    const focusAreas = [];
    const recommendations = [];

    if (quality !== null && quality >= 90) {
        strengths.push("คุณภาพการเคลื่อนไหวอยู่ในระดับดีมาก");
    }
    if (accuracy !== null && accuracy >= 90) {
        strengths.push("ความแม่นยำของ Rep อยู่ในระดับดี");
    }
    if (symmetry !== null && symmetry >= 90) {
        strengths.push("การเคลื่อนไหวซ้ายและขวาสมดุลดี");
    }

    if (symmetry !== null && symmetry < 80) {
        addFocus(
            focusAreas,
            "symmetry",
            "high",
            "ปรับสมดุลการเคลื่อนไหว",
            "พยายามรักษาตำแหน่งแขนและขาทั้งสองข้างให้ใกล้เคียงกันมากขึ้น"
        );
        recommendations.push({
            type: "symmetry",
            title: "Improve movement symmetry",
            message: "พยายามรักษาตำแหน่งแขนและขาทั้งสองข้างให้ใกล้เคียงกันมากขึ้น",
            priority: "high"
        });
    }

    if (armROM !== null && armROM < 80) {
        addFocus(
            focusAreas,
            "arm-rom",
            "medium",
            "เพิ่มช่วงการเคลื่อนไหวของแขน",
            "ลองเพิ่มช่วงการกางแขนให้เต็มช่วงการเคลื่อนไหวของท่า"
        );
        recommendations.push({
            type: "arm-rom",
            title: "Improve arm ROM",
            message: "ลองเพิ่มช่วงการกางแขนให้เต็มช่วงการเคลื่อนไหวของท่า",
            priority: "medium"
        });
    }

    if (legROM !== null && legROM < 80) {
        addFocus(
            focusAreas,
            "leg-rom",
            "medium",
            "เพิ่มช่วงการเคลื่อนไหวของขา",
            "ลองเพิ่มช่วงการกางขาให้เต็มช่วงการเคลื่อนไหวของท่า"
        );
        recommendations.push({
            type: "leg-rom",
            title: "Improve leg ROM",
            message: "ลองเพิ่มช่วงการกางขาให้เต็มช่วงการเคลื่อนไหวของท่า",
            priority: "medium"
        });
    }

    if (accuracy !== null && accuracy < 80) {
        addFocus(
            focusAreas,
            "accuracy",
            "medium",
            "เพิ่มความแม่นยำของ Rep",
            "ลดความเร็วลงเล็กน้อยและเน้นทำตามตำแหน่งที่ระบบแนะนำ"
        );
        recommendations.push({
            type: "accuracy",
            title: "Improve repetition accuracy",
            message: "ลดความเร็วลงเล็กน้อยและเน้นทำตามตำแหน่งที่ระบบแนะนำ",
            priority: "medium"
        });
    }

    if (quality !== null && quality < 70) {
        addFocus(
            focusAreas,
            "quality",
            "high",
            "พัฒนาคุณภาพการเคลื่อนไหว",
            "เน้นความถูกต้องของท่าก่อนเพิ่มความเร็ว"
        );
        recommendations.push({
            type: "quality",
            title: "Improve movement quality",
            message: "เน้นความถูกต้องของท่าก่อนเพิ่มความเร็ว",
            priority: "high"
        });
    }

    if (consistency !== null && consistency < 85) {
        addFocus(
            focusAreas,
            "consistency",
            "low",
            "รักษาจังหวะให้สม่ำเสมอ",
            "ลดความเร็วลงเล็กน้อยและรักษาจังหวะของแต่ละ Rep ให้ใกล้เคียงกัน"
        );
        recommendations.push({
            type: "consistency",
            title: "Improve movement consistency",
            message: "ลดความเร็วลงเล็กน้อยและรักษาจังหวะของแต่ละ Rep ให้ใกล้เคียงกัน",
            priority: "low"
        });
    }

    if (trend.direction === "up") {
        strengths.push("คุณมีพัฒนาการด้านคุณภาพการเคลื่อนไหวที่ดีขึ้น");
    }

    const priority = focusAreas.length
        ? focusAreas[0].type
        : trend.direction === "up"
            ? "progress"
            : "general";

    const summary = focusAreas.length
        ? focusAreas[0].message
        : trend.direction === "up"
            ? "คุณมีพัฒนาการที่ดีขึ้นจากการฝึกครั้งก่อน"
            : quality !== null && quality >= 90
                ? "การเคลื่อนไหวของคุณอยู่ในระดับดีมาก"
                : "ฝึกต่อโดยเน้น Range of Motion และความสม่ำเสมอของการเคลื่อนไหว";

    if (!recommendations.length && trend.status === "insufficient-data") {
        recommendations.push({
            type: "general",
            title: "ฝึกต่อเพื่อเก็บข้อมูล",
            message: "ฝึกเพิ่มอีกเล็กน้อยเพื่อให้ระบบวิเคราะห์พัฒนาการของคุณได้แม่นยำขึ้น",
            priority: "low"
        });
    }

    return {
        summary,
        priority,
        recommendations,
        strengths,
        focusAreas,
        trend
    };
}
