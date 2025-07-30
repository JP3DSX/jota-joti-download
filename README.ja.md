# Jota-Jotiダウンロード

このリポジトリには、JOTA-JOTIイベントで使用する小さなWebアプリとサポートスクリプトのソースコードが含まれています。ユーザーは秘密の *合言葉* を入力することで、デジタルスタンプ画像をダウンロードできます。合言葉と対応する画像はFirestoreに保存されます。

## パッケージ

- **jota-joti-downloadv1** – Tailwindで構築されたHTML/CSS/JS実装。
- **jota-joti-downloadv2** – 同じサイトをTypeScript + Viteで実装したバージョン。
- **aikotoba-import** – `aikotoba.csv` の内容をFirestoreに取り込むためのNode.jsスクリプト。

## 開発

各パッケージは独自の `package.json` を持っています。主なコマンドは以下のとおりです。

```bash
npm install       # 依存関係のインストール
npm run dev       # ローカル開発サーバーを起動
npm run build     # 本番用にビルド
```

一部のパッケージにはFirebase Hosting用の `deploy` スクリプトも含まれています。

## ライセンス

このプロジェクトには個別のライセンスファイルは付属していません。権利はすべてオリジナルの作者に帰属します。
