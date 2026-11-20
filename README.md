# skypermit-qa-kit

macOS, Postman CLI в песочнице Claude Code:
- .claude/settings.local.json: sandbox.enableWeakerNetworkIsolation: true (проверка TLS-сертификатов через trustd), в deniedDomains нет "*";
- .claude/settings.json: allowedDomains — gateway.postman.com, dl-cli.pstmn.io, events.getpostman.com, skypermit.vercel.app;
  deniedDomains — api.anthropic.com, http-intake.logs.us5.datadoghq.com.

Если служебный домен Postman не решён заранее (висит вопрос песочницы или отказ), CLI обрывает загрузку коллекции: "collection could not be loaded … aborted".

Загрузка коллекции Postman CLI в песочнице изредка обрывается ("collection could not be loaded … aborted"), в том числе
в свежей сессии; до SkyPermit при этом не уходит ни один запрос. postman-cli-run сам делает один повтор в этом случае;
если и он не помог — оркестратор печатает команды для прогона в свежей сессии и записи результатов в Testomat.
