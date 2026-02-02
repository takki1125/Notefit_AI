# functions/main.py
from firebase_functions import firestore_fn, options
from firebase_admin import initialize_app, firestore

# Firebaseアプリを初期化
initialize_app()

# Firestoreの /users/{userId}/workouts/{workoutId} にデータが書き込まれたら起動
@firestore_fn.on_document_written(
    document="users/{userId}/workouts/{workoutId}",
    region="asia-northeast1",  # 東京リージョン
    memory=options.MemoryOption.MB_512, # メモリ設定（AI用には少し多めにしておく）
)
def on_workout_written(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]]) -> None:
    """
    筋トレ記録が保存されたらトリガーされる関数
    """
    # 1. データが存在しない（削除された）場合は何もしない
    if event.data is None:
        return

    # 2. 新しいデータを取得
    try:
        new_data = event.data.after.to_dict() or {}
    except Exception as e:
        print(f"Error reading data: {e}")
        return

    # 3. 無限ループ防止チェック（重要！）
    # 自分が書き込んだ「完了」データにまた反応しないようにする
    if new_data.get("status") == "completed":
        print("Already processed. Skip.")
        return

    # 4. ログ出力（Cloud Functionsのログ画面で確認できます）
    print(f"新しい筋トレ記録を検知しました！ User: {event.params['userId']}")
    print(f"メモ内容: {new_data.get('memo')}")

    # 5. Firestoreに書き込み（AIの代わりに返事をする）
    # update()を使うと、指定したフィールドだけ変更できます
    event.data.after.reference.update({
        "status": "completed",
        "ai_advice": "【システム連携成功】Pythonバックエンドから応答しました！このメッセージが見えていれば成功です。"
    })