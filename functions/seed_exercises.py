import firebase_admin
from firebase_admin import credentials, firestore

# ★鍵ファイルの設定
cred = credentials.Certificate("serviceAccountKey.json")

# 初期化
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ==========================================
# ★ここが進化！入力タイプ("type")を追加
# ==========================================
master_data = {
    "chest": {
        "label": "胸 (Chest)",
        "categories": {
            "フリーウエイト": {
                "type": "normal",
                "exercises": ["ベンチプレス(ダンベル)","ベンチプレス(バーベル)","ベンチプレス(スミス)","インクラインベンチプレス(ダンベル)","インクラインベンチプレス(バーベル)","インクラインベンチプレス(スミス)", "ディップス(重り付き)","ダンベルフライ","インクラインダンベルフライ", "インクラインベンチ"]
            },
            "マシン": {
                "type": "normal",
                "exercises": ["バタフライマシン","チェストフライ","チェストプレス","デクラインチェストプレス", "ペックフライ", "ケーブルクロスオーバー"]
            },
            "自重": {
                "type": "bodyweight",
                "exercises": ["プッシュアップ", "ディップス"]
            },
            "アシストマシン":{
                "type":"assist",
                "exercises": ["ディップス(補助付き)"] 
            }
        }
    },
    "back": {
        "label": "背中 (Back)",
        "categories": {
            "フリーウエイト": {
                "type": "normal",
                "exercises": ["デッドリフト", "ベントオーバーロウ", "ワンハンドロウ"]
            },
            "マシン": {
                "type": "normal",
                "exercises": ["ラットプルダウン", "シーテッドロウ"]
            },
            "自重/懸垂": {
                "type": "bodyweight",
                "exercises": ["チンニング（懸垂）", "斜め懸垂"]
            },
            "アシストマシン": {
                "type": "assist",
                "exercises": ["アシストチンニング", "チューブ補助懸垂"]
            }
        }
    },
    "legs": {
        "label": "脚 (Legs)",
        "categories": {
            "フリーウエイト": {
                "type": "normal",
                "exercises": ["スクワット", "ランジ", "ブルガリアンスクワット"]
            },
            "マシン": {
                "type": "normal",
                "exercises": ["レッグプレス", "レッグエクステンション", "レッグカール"]
            },
            "自重": {
                "type": "bodyweight",
                "exercises": ["自重スクワット", "カーフレイズ"]
            }
        }
    },
    "shoulders": {
        "label": "肩 (Shoulders)",
        "categories": {
            "フリーウエイト": {
                "type": "normal",
                "exercises": ["サイドレイズ", "ショルダープレス", "フロントレイズ", "リアデルト"]
            },
            "マシン": {
                "type": "normal",
                "exercises": ["マシンショルダープレス", "ケーブルサイドレイズ"]
            }
        }
    },
    "arms": {
        "label": "腕 (Arms)",
        "categories": {
            "フリーウエイト": {
                "type": "normal",
                "exercises": ["アームカール", "ハンマーカール", "トライセプスエクステンション"]
            },
            "マシン": {
                "type": "normal",
                "exercises": ["ケーブルカール", "ケーブルプレスダウン"]
            }
        }
    }
}

def upload_data():
    print("データ登録を開始します...")
    
    batch = db.batch()
    
    for body_part, data in master_data.items():
        doc_ref = db.collection("master_data").document(body_part)
        batch.set(doc_ref, data)
        print(f"準備中: {data['label']}")
    
    batch.commit()
    print("完了！入力タイプ付きのデータが保存されました。")

if __name__ == "__main__":
    upload_data()