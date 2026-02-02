# functions/seed_exercises.py
import firebase_admin
from firebase_admin import credentials, firestore

# 初期化（自動で認証情報を探します）
if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.client()

# ==========================================
# ここに登録したい種目を定義（自由に増やせます）
# ==========================================
master_data = {
    "chest": {
        "label": "胸 (Chest)",
        "exercises": ["ベンチプレス", "ダンベルフライ", "インクラインベンチ", "チェストプレス", "ペックフライ"]
    },
    "back": {
        "label": "背中 (Back)",
        "exercises": ["デッドリフト", "ラットプルダウン", "懸垂", "ベントオーバーロウ", "シーテッドロウ"]
    },
    "legs": {
        "label": "脚 (Legs)",
        "exercises": ["スクワット", "レッグプレス", "レッグエクステンション", "レッグカール", "ランジ"]
    },
    "shoulders": {
        "label": "肩 (Shoulders)",
        "exercises": ["サイドレイズ", "ショルダープレス", "フロントレイズ", "リアデルト", "アーノルドプレス"]
    },
    "arms": {
        "label": "腕 (Arms)",
        "exercises": ["アームカール", "トライセプスエクステンション", "ハンマーカール"]
    }
}

def upload_data():
    print("データ登録を開始します...")
    
    # "master_data" というコレクションの中に、部位ごとのドキュメントを作る
    batch = db.batch()
    
    for body_part, data in master_data.items():
        doc_ref = db.collection("master_data").document(body_part)
        batch.set(doc_ref, data)
        print(f"準備中: {data['label']}")
    
    batch.commit()
    print("完了！すべての種目がFirestoreに保存されました。")

if __name__ == "__main__":
    upload_data()