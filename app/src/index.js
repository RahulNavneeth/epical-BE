import express from 'express';
import bodyParser from 'body-parser';
import XLSX from 'xlsx';
import fs from 'fs';
import cors from 'cors';
const app = express();

const PORT = process.env.PORT;

if (!PORT) {
    throw new Error('PORT is not defined');
}

const FILE_PATH = '../app/data/result.xlsx';
const CANDIDATE_FILE_PATH = `../app/data/candidates.xlsx`;
const PROBLEM_SET_FILE_PATH = `../app/data/problem-set.xlsx`;

let workbook, worksheet;
let candidateWorkbook, candidateWorksheet;
let problemSetWorkbook, problemSetWorksheet;

problemSetWorkbook = XLSX.readFile(PROBLEM_SET_FILE_PATH);
problemSetWorksheet = problemSetWorkbook.Sheets[problemSetWorkbook.SheetNames[0]];
const problemSetData = XLSX.utils.sheet_to_json(problemSetWorksheet);

if (fs.existsSync(FILE_PATH)) {
    workbook = XLSX.readFile(FILE_PATH);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
} else {
    workbook = XLSX.utils.book_new();
    worksheet = XLSX.utils.aoa_to_sheet([
        ['S.NO', 'Candidate Name', 'Reg No', 'Mark']
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet 1');
}
class Queue {
    constructor() {
        this.tasks = [];
    }

    addTask(task) {
        this.tasks.push(task);
    }

    getNextTask() {
        return this.tasks.shift();
    }

    get isEmpty() {
        return this.tasks.length === 0;
    }
}

const markSavingQueue = new Queue();

app.use(bodyParser.json(), cors());

app.post('/login', (req, res) => {
    const { candidateName, regNo, password } = req.body;
    if (fs.existsSync(FILE_PATH)) {
        workbook = XLSX.readFile(FILE_PATH);
        worksheet = workbook.Sheets[workbook.SheetNames[0]];
    }
    const data = XLSX.utils.sheet_to_json(worksheet);
    if (data.length > 0) {
        const candidate = data.find(
            (candidate) =>
                `${candidate['Candidate Name']}` === `${candidateName}` &&
                `${candidate['Reg No']}` === `${regNo}`
        );
        if (candidate) {
            return res.send({ success: false, message: 'You have already taken the test' });
        }
    }

    candidateWorkbook = XLSX.readFile(CANDIDATE_FILE_PATH);
    candidateWorksheet = candidateWorkbook.Sheets[candidateWorkbook.SheetNames[0]];
    const candidateData = XLSX.utils.sheet_to_json(candidateWorksheet);
    if (candidateData.length > 0) {
        const candidate = candidateData.find(
            (candidate) =>
                `${candidate['Candidate Name']}` === `${candidateName}` &&
                `${candidate['Reg No']}` === `${regNo}` &&
                `${candidate['Password']}` === `${password}`
        );
        if (!candidate) {
            return res.send({ success: false, message: 'Invalid credentials' });
        }
    }
    res.send({ success: true, message: 'Login successful' });
});

app.get('/', (_, res) => {
    res.send({ success: true, message: 'EPICAL LAYOUT ON PORT: ' + PORT });
})

app.get('/get-metadata', (_, res) => {
    const metaDataWorkbook = XLSX.readFile('data/meta.xlsx');
    const metaDataWorksheet = metaDataWorkbook.Sheets[metaDataWorkbook.SheetNames[0]];
    const metaData = XLSX.utils.sheet_to_json(metaDataWorksheet);
    const terms = fs.readFileSync('data/terms.txt', 'utf-8').split('\n');
    res.send({ success: true, message: "Meta data fetched successfully", data: { ...(metaData[0]), terms } });
})


app.post('/save-mark', (req, res) => {
    markSavingQueue.addTask(req);
    res.send({ success: true, message: 'Your submission has been queued for processing' });
});


async function processQueue() {
    // let count = 0;
    while (!markSavingQueue.isEmpty) {
        const task = markSavingQueue.getNextTask();
        await saveMark(task);
        // console.log(`Processing task - ${count}`, task.body);
    }
    setTimeout(processQueue, 1000);
}

const saveMark = async (req) => {
    const { candidateName, regNo } = req.body;
    let mark = 0;
    const A = req.body["answer"].filter((answer) => answer !== null);
    const answer = A.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < A.length; i++) {
        const problem = problemSetData[A[i][0] - 1];
        if (parseInt(problem['Answer']) === parseInt(answer[i][1])) {
            mark++;
        }
    }
    const ref = worksheet['!ref'];
    const rowCount = ref ? XLSX.utils.decode_range(ref).e.r + 1 : 1;
    const newRow = [rowCount, candidateName, regNo, mark];
    XLSX.utils.sheet_add_aoa(worksheet, [newRow], { origin: -1 });

    workbook.Sheets[workbook.SheetNames[0]] = worksheet;
    XLSX.writeFile(workbook, FILE_PATH);

}

processQueue();

app.get('/get-problems', (_, res) => {
    const data = problemSetData.map((problem) => {
        const { Answer, ...rest } = problem;
        return rest;
    });
    res.send({ success: true, data });
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
