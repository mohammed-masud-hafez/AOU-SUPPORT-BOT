from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import google.generativeai as genai
from rapidfuzz import process, fuzz
from dotenv import load_dotenv  

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("models/gemini-1.5-flash")

app = Flask(__name__)
CORS(app)

# تحميل البيانات من CSV
kb = pd.read_csv("../data/kb.csv")

@app.route("/health")
def health():
    return "ok", 200

@app.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    question = (payload.get("message") or "").strip()

    if not question:
        return jsonify({"answer": "يرجى كتابة السؤال."})

    # محاولة مطابقة السؤال مع الأسئلة
    match_question = process.extractOne(
        question, kb['question'], scorer=fuzz.token_set_ratio
    )

    # محاولة مطابقة السؤال مع الإجابات (البحث العكسي)
    match_answer = process.extractOne(
        question, kb['answer'], scorer=fuzz.token_set_ratio
    )

    # نحدد الأفضل بين السؤال والجواب
    use_reverse = False
    if match_answer and (not match_question or match_answer[1] > match_question[1]):
        use_reverse = True

    # إعداد السياق لـ Gemini
    if use_reverse and match_answer[1] > 60:
        matched_text = match_answer[0]
        matched_questions = kb[kb['answer'] == matched_text]['question'].tolist()
        context = f"وجدت أن استفسارك يشير إلى معلومات مرتبطة بالتالي:\n" + "\n".join(
            f"- {q}" for q in matched_questions
        ) + f"\n\nالإجابة المرتبطة بهذه المواضيع:\n{matched_text}"
        prompt = f"""
أنت مساعد جامعي ذكي. لديك قاعدة بيانات تحتوي على أسئلة وأجوبة متعلقة بالجامعة.

المستخدم كتب: "{question}"

استنادًا إلى إجابات مشابهة في قاعدة البيانات، هذه المعلومات ذات صلة:

{context}

اعتمد على ما سبق وقدم إجابة بشرية واضحة، بأسلوب ودود ومفهوم، وكأنك تشرح لشخص حقيقي، بدون أن تكرر السؤال.
"""
    else:
        prompt = f"""
أنت مساعد جامعي ذكي. لديك قاعدة بيانات فيها أسئلة وأجوبة من طلاب الجامعة.

السؤال: "{question}"

هذه بعض الأمثلة من قاعدة البيانات:
{format_kb(kb)}

اعتمد على ما سبق وقدّم إجابة مفهومة، لطيفة، ومرتبة. لو ما حصلت إجابة مناسبة، قل بلُطف: "عذرًا، لا توجد معلومات دقيقة لهذا السؤال حاليًا."
"""

    try:
        response = model.generate_content(prompt)
        return jsonify({"answer": response.text.strip()})
    except Exception as e:
        return jsonify({"answer": f"حدث خطأ أثناء المعالجة: {str(e)}"})

def format_kb(df):
    return "\n".join(
        f"- سؤال: {row['question']}\n  جواب: {row['answer']}" for _, row in df.iterrows()
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
