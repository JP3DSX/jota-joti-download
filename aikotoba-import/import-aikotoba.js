import fs from 'fs';
import csv from 'csv-parser';
import inquirer from 'inquirer';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(fs.readFileSync('./.key/jota-joti-651ef-serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const aikotobaRef = db.collection('aikotoba');

function isHiraganaOnly(text) {
  return /^[\u3040-\u309F]+$/.test(text);
}

function isValidImagePath(path) {
  return /^\/images\/[a-zA-Z0-9_\-]+\.(jpg|png|jpeg)$/.test(path);
}

async function main() {
  // Step 1: 対話型CLIで設定取得
  const { overwriteMode, saveLog, deleteMode, deleteConfirmationMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'overwriteMode',
      message: '既存の合言葉があった場合の処理を選んでください：',
      choices: [
        { name: 'すべて上書き（overwrite all）', value: 'all' },
        { name: '確認しながら個別に上書き（prompt）', value: 'prompt' },
        { name: '一切上書きしない（none）', value: 'none' }
      ]
    },
    {
      type: 'confirm',
      name: 'saveLog',
      message: '処理ログをファイル（import.log）にも保存しますか？',
      default: true
    },
    {
      type: 'confirm',
      name: 'deleteMode',
      message: 'CSVにない合言葉を完全削除しますか？（無効化のみでよければNo）',
      default: false
    },
    {
      type: 'list',
      name: 'deleteConfirmationMode',
      message: '削除確認方法を選んでください：',
      when: (answers) => answers.deleteMode,
      choices: [
        { name: '個別に確認して削除', value: 'prompt' },
        { name: '確認なしで一括削除', value: 'all' }
      ]
    }
  ]);

  console.log(`🔧 上書き: ${overwriteMode}, ログ保存: ${saveLog}, 削除モード: ${deleteMode ? '有効' : '無効'}, 削除確認モード: ${deleteConfirmationMode || 'なし'}`);

  // Step 2: FirestoreとCSVを全件取得
  const existingDocs = await aikotobaRef.get();
  const existingMap = new Map();
  existingDocs.forEach(doc => {
    existingMap.set(doc.id, doc.data());
  });

  const csvData = [];
  fs.createReadStream('aikotoba.csv')
    .pipe(csv())
    .on('data', (data) => csvData.push(data))
    .on('end', async () => {
      const batch = db.batch();
      const nowKeys = new Set();

      const overwriteCandidates = [];
      const newEntries = [];
      const invalidEntries = [];

      // CSV解析＆バリデーション
      for (const row of csvData) {
        const keyword = row.keyword?.trim();
        const imagePath = row.imagePath?.trim();
        const enabled = row.enabled?.toLowerCase() === 'true';

        if (!keyword || !isHiraganaOnly(keyword) || !imagePath || !isValidImagePath(imagePath)) {
          console.warn(`⛔ 無効なエントリ: ${JSON.stringify(row)}`);
          invalidEntries.push(keyword);
          continue;
        }

        nowKeys.add(keyword);

        if (existingMap.has(keyword)) {
          overwriteCandidates.push({ keyword, imagePath, enabled });
        } else {
          newEntries.push({ keyword, imagePath, enabled });
        }
      }

      // Step 3: Overwrite処理
      for (const entry of overwriteCandidates) {
        if (overwriteMode === 'all') {
          batch.set(aikotobaRef.doc(entry.keyword), { imagePath: entry.imagePath, enabled: true });
          console.log(`♻ 上書き: ${entry.keyword}`);
        } else if (overwriteMode === 'prompt') {
          const { shouldOverwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldOverwrite',
              message: `合言葉「${entry.keyword}」は既に存在します。上書きしますか？`,
              default: false
            }
          ]);
          if (shouldOverwrite) {
            batch.set(aikotobaRef.doc(entry.keyword), { imagePath: entry.imagePath, enabled: true });
            console.log(`♻ 上書き: ${entry.keyword}`);
          } else {
            console.log(`⏩ スキップ: ${entry.keyword}`);
          }
        } else {
          console.log(`⏩ スキップ: ${entry.keyword}（上書きなしモード）`);
        }
      }

      // Step 4: 新規登録
      for (const entry of newEntries) {
        batch.set(aikotobaRef.doc(entry.keyword), { imagePath: entry.imagePath, enabled: true });
        console.log(`➕ 新規登録: ${entry.keyword}`);
      }

      // Step 5: CSVにない既存の処理
      const toDeleteCandidates = [];
      for (const [keyword, data] of existingMap.entries()) {
        if (!nowKeys.has(keyword)) {
          if (deleteMode) {
            toDeleteCandidates.push(keyword);
          } else {
            batch.update(aikotobaRef.doc(keyword), { enabled: false });
            console.log(`🔻 無効化: ${keyword}`);
          }
        }
      }

      // Step 6: 削除処理
      if (deleteMode) {
        if (deleteConfirmationMode === 'all') {
          for (const keyword of toDeleteCandidates) {
            await aikotobaRef.doc(keyword).delete();
            console.log(`❌ 削除: ${keyword}`);
          }
        } else if (deleteConfirmationMode === 'prompt') {
          for (const keyword of toDeleteCandidates) {
            const { shouldDelete } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'shouldDelete',
                message: `合言葉「${keyword}」はCSVにありません。削除しますか？`,
                default: false
              }
            ]);
            if (shouldDelete) {
              await aikotobaRef.doc(keyword).delete();
              console.log(`❌ 削除: ${keyword}`);
            } else {
              console.log(`⚠️ スキップ: ${keyword}`);
            }
          }
        }
      }

      // Step 7: コミット
      await batch.commit();
      console.log('🎉 インポート完了');
    });
}

main();
