const prog = require('caporal');
const fs = require('fs');
const winston = require('winston');
const nmp =require('npm-programmatic');
const packagesToInstall = require('./packages_to_install');
const _levels = {
  colors: {
    error: 'red',
    info: 'green'
  }
};
const logger = winston.createLogger({
  format: winston.format.cli(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console()
  ],
});
winston.addColors(_levels.colors)
winston.format.combine(
  winston.format.colorize(),
  winston.format.json()
);
let instance = null;
class NPMProjectGenerator {
  constructor(){
    this.generate = this.generate.bind(this);
    this.SRC_DIR_NAME = 'src';
  }
  static getInstance(){
    if(!instance)
    {
      instance = new NPMProjectGenerator();
    }
    return instance;
  }
  generate(args,opts,logger) {
    try{
      opts = this.pre(opts);
      this.validate(opts);
      const paths = this.getProjectPaths(opts);
      fs.mkdirSync(paths.BASE,'0777');
      logger.info('BASE directory created.')
      fs.mkdirSync(paths.SRC,'0777');
      logger.info('SRC directory created.');
      fs.openSync(paths.INDEXJS,'w');
      logger.info('EMPTY index.js file created in BASE directory.');
      this.createPackageJSONFile(opts, paths.PACKAGEJSON);
      this.installDevPackages(paths.BASE);
      this.createBabelFile(paths.BABELRC);
      this.createESLintFile(paths.ESLINT);
      this.installProjectPackages(paths.BASE);
    }catch(error) {
      logger.error(error.message);
    }
  }
  validate(opts) {
    if(!opts.name) {
      throw new Error("name is required");
    } else if(opts.name && fs.existsSync(this.getProjectDirectoryPath(opts))) {
      throw new Error("Directory already exists. Please specify different project name.");
    }
  }
  pre(opts) {
    if(!('cwd' in opts) || typeof opts.cwd === 'undefined' || !opts.cwd) {
      opts.cwd = process.cwd();
    }
    console.log(opts.cwd)

    return opts;
  }
  getProjectDirectoryPath({name,cwd}) {
    return `${cwd}/${name}`;
  }
  getProjectPaths(opts) {
    const BASE = this.getProjectDirectoryPath(opts); 
    return {
      SRC: `${BASE}/${this.SRC_DIR_NAME}`,
      BASE: `${BASE}`,
      INDEXJS: `${BASE}/index.js`,
      PACKAGEJSON: `${BASE}/package.json`,
      BABELRC: `${BASE}/.babelrc`,
      ESLINT: `${BASE}/.eslintrc.js`
    }
  }
  createPackageJSONFile({name}, path) {
    let contents = fs.readFileSync('./templates/package.json.tpl','utf8');
    contents = contents.replace('#package_name#',name);
    contents = contents.replace('#start_script#', 'nodemon --exec babel-node index');
    fs.openSync(path,'w');
    fs.writeFileSync(path,contents);
    logger.info('TEMPLATE package.json file created in BASE directory. Update it!!!');
  }
  installDevPackages(path) {
    logger.info('Installing dev packages.. This may take a while')
    nmp.install(packagesToInstall.dev, {
      saveDev : true,
      cwd: path,
      output: true
    }).then(() => {
      logger.info(`DEV packages installed successfully => ${packagesToInstall.dev.join(',')}`)
    }).catch((err) => {
      logger.error('Error occured while installing dev packages. ' + err.message);
    })
  }
  installProjectPackages(path) {
    logger.info('Installing dev packages.. This may take a while')
    nmp.install(packagesToInstall.project, {
      cwd: path,
      output: true
    }).then(() => {
      logger.info(`Project packages installed successfully => ${packagesToInstall.project.join(',')}`)
    }).catch((err) => {
      logger.error('Error occured while installing Project packages. ' + err.message);
    })
  }
  createBabelFile(path) {
    const contents = `{
      "presets": [
        "@babel/preset-env"
      ]
    }`;
    fs.openSync(path,'w');
    fs.writeFileSync(path,contents);
    logger.info('.babelrc file created in BASE directory.');
  }
  createESLintFile(path) {
    const contents = `
      module.exports = {
        env: {
          browser: true,
          commonjs: true,
          es6: true,
        },
        extends: [
          'airbnb-base',
        ],
        globals: {
          Atomics: 'readonly',
          SharedArrayBuffer: 'readonly',
        },
        parserOptions: {
          ecmaVersion: 2018,
        },
        rules: {
        },
      };
    `;
    fs.openSync(path,'w');
    fs.writeFileSync(path,contents);
    logger.info('.eslintrc.js file created in BASE directory.');
  }
}
const npmGeneratorInstance = NPMProjectGenerator.getInstance();


prog
  .version('1.0.0')
  .logger(logger)
  .command('generate', 'Generate project')
  .option('--name <name>', 'Project name',prog.STRING,'',true)
  .option('--cwd <cwd>', 'Current working directory.',prog.STRING,'',false)
  .action(npmGeneratorInstance.generate);
 
prog.parse(process.argv);


