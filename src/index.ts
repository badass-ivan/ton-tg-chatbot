import { BotService } from "./services/bot.service";
import { PostgresRepository } from "./repository/postgres.repository";

function main() {
    PostgresRepository.init();
    BotService.start();
}

const defaultLog = console.log;
console.log = (...args) => {
    defaultLog(...args, new Date())
}

main();
