// https://github.com/spotboard/domjudge-converter/blob/master/index.js

const config = require('./config');
const fs = require('fs');
const path = require('path');
const axios = require('axios').create({
    baseURL: config.cms.scoreboard,
    timeout: config.axios.timeout || 3000,
});

const colors = ["red","orange","yellow","darkgreen","skyblue","blue","purple","white","ivory","deeppink","brown","pink"];

class CMSConverter{
    constructor() {}

    async loadContest() {
        console.log('Fetching contest ...');

        const contests = (await axios.get('/contests/')).data;
        let contestID = "";
        for(const i in contests){ contestID = i; break; }
        const contest = contests[contestID];

        this.contestID = contestID;
        this.title = contest['name']; // title
        this.startTime = contest['begin'];
        this.endTime = contest['end'];
        this.duration = this.endTime - this.startTime; // contestTime

        console.log('Fetching contest ... finished!!!');
    }

    async loadTeams() {
        console.log('Fetching constants ...');

        const teams = (await axios.get('/users/')).data;
        this.teams = [];
        this.teamMap = {};

        let id = 1;
        for(const team in teams) {
            if(!teams.hasOwnProperty(team)) continue;
            const user_id = team;
            const name = teams[team]['f_name'] + ' ' + teams[team]['l_name'];
            const group = teams[team]['team'];
            this.teams.push({ "id": id, "user_id": user_id, "name": name, "group": group });
            this.teamMap[user_id] = id;
            id++;
        }

        console.log('Fetching constants ... finished!!!');
    }

    async loadProblems() {
        console.log('Fetching problems ...');

        const problems = (await axios.get('/tasks/')).data;
        this.problems = [];
        this.problemMap = {};

        let id = 0;
        for(const problem in problems) {
            if(!problems.hasOwnProperty(problem)) continue;
            if(problems[problem]['contest'] !== this.contestID) continue;
            const name = String.fromCharCode(65+id), color = colors[id], title = problems[problem]['name'];
            this.problems.push({ id: id, "name": name, "color": color, "title": title });
            this.problemMap[title] = id;
            id++;
        }

        console.log('Fetching problems ... finished!!!');
    }

    async loadSubmissions() {
        console.log('Fetching submissions ...');

        this.elapsed_time_in_sec = Math.floor((new Date().getTime()) / 1000) - this.startTime;
        if(this.elapsed_time_in_sec > this.duration) this.elapsed_time_in_sec = this.duration;

        const submissions = (await axios.get('/history')).data;
        this.submissions = [];

        for(let i=0; i<submissions.length; i++) {
            const id = i + 1;
            const team = this.teamMap[submissions[i][0]];
            const problem = this.problemMap[submissions[i][1]];
            const result = submissions[i][3] === 100 ? 'Yes' : 'No';
            const submissionTime = Math.floor((submissions[i][2] - this.startTime) / 60);
            if(submissionTime > this.duration / 60) continue;
            this.submissions.push({
                "id": id, "team": team, "problem": problem,  "result": result, "submissionTime": submissionTime
            });
        }

        console.log('Fetching submissions ... finished!!!');
    }

    async writeContest() {
        console.log('Writing into contest.json ...');

        const teams = this.teams.map(e => ({
            id: e.id,  name: e.name,  group: e.group
        }));

        const problems = this.problems.map(e => ({
            id: e.id, title: e.title, name: e.name, color: e.color || ''
        }));

        const contest = {
            title: this.title,
            systemName: 'Contest Management System',
            systemVersion: '',
            problems,
            teams
        };

        await new Promise((resolve, reject) => {
            fs.writeFile(path.join(config.dest, 'contest.json'), JSON.stringify(contest, null, 4), err => {
                if (err) reject(err);
                resolve(true);
            });
        });

        console.log('Writing into contest.json ... finished!!!');
    }

    async writeRuns() {
        console.log('Writing into runs.json ...');

        const data = {
            time: {
                contestTime: this.elapsed_time_in_sec,
                noMoreUpdate: !config.unfreeze && this.elapsed_time_in_sec > config.freezeTime * 60,
                timestamp: 0
            },
            runs: this.submissions
        };

        await new Promise((resolve, reject) => {
            fs.writeFile(path.join(config.dest, 'runs.json'), JSON.stringify(data, null, 4), err => {
                if (err) reject(err);
                resolve(true);
            });
        });

        console.log('Writing into runs.json ... finished!!!');
    }


    async do() {
        await Promise.all([
            this.loadContest(),
            this.loadTeams(),
        ]);
        await this.loadProblems();
        await this.loadSubmissions();

        console.log('======================\n');
        const { contest } = this;

        this.submissions = this.submissions.map(e => {
            const x = {...e};
            if(!config.unfreeze && this.elapsed_time_in_sec > config.freezeTime * 60 && e.submissionTime > config.freezeTime) {
                x.result = '';
            }
            return x;
        });

        await Promise.all([
            this.writeContest(),
            this.writeRuns()
        ]);

        console.log('======================\n');
    }
}

const converter = new CMSConverter();

const run = () => {
    converter.do()
        .then(() => {
            if(config.interval) { setTimeout(run, config.interval); }
        })
        .catch(err => {
            if(err.toString()) { console.error(err.toString()); }
            else { console.error(err); }
        });
};

run();