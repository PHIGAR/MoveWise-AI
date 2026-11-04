const guides = {
    'jumping-jack': ['ยืนตรง ให้กล้องเห็นตั้งแต่ศีรษะถึงเท้า', 'กระโดดแยกเท้าและยกแขน แล้วกลับสู่ท่ายืนเดิม'],
    squat: ['หันด้านข้างเล็กน้อย ให้กล้องเห็นสะโพก เข่า และข้อเท้า', 'ย่อตัวตามช่วงที่สบาย แล้วกลับมายืนตรงอย่างควบคุม'],
    'push-up': ['ตั้งกล้องด้านข้าง ให้เห็นไหล่ ข้อมือ สะโพก และเท้า', 'งอข้อศอกลดตัว แล้วดันกลับโดยรักษาแนวลำตัว'],
    lunge: ['ให้กล้องเห็นร่างกายเต็มตัวและมีพื้นที่ก้าวเท้า', 'ก้าวและย่อตัวอย่างควบคุม แล้วกลับมายืนก่อนเริ่มครั้งถัดไป'],
    'bicep-curl': ['หันเข้าหากล้อง ให้เห็นไหล่ ข้อศอก และข้อมือ', 'งอข้อศอกยกแขน แล้วค่อย ๆ ลดกลับ โดยให้ต้นแขนอยู่ใกล้ลำตัว'],
    'six-seven': ['หันเข้าหากล้อง ให้เห็นแขนทั้งสองข้าง', 'สลับระดับข้อมือซ้าย–ขวาเป็นจังหวะ ให้ครบทั้งสองทิศทาง']
};

export function renderExerciseGuide(container, exerciseId) {
    container.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = 'ก่อนเริ่มฝึก';
    const list = document.createElement('ol');
    (guides[exerciseId] ?? []).forEach(text => {
        const item = document.createElement('li'); item.textContent = text; list.append(item);
    });
    const privacy = document.createElement('p');
    privacy.textContent = 'กล้องเปิดเมื่อกดเริ่มเท่านั้น • ภาพวิดีโอประมวลผลบนอุปกรณ์ ไม่บันทึกหรืออัปโหลดวิดีโอ หากไม่สบายหรือเจ็บ ให้หยุดพัก';
    container.append(heading, list, privacy);
}
