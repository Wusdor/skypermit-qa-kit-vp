# skypermit-qa-kit

macOS, Postman CLI в песочнице Claude Code:
- .claude/settings.local.json: sandbox.enableWeakerNetworkIsolation: true (проверка TLS-сертификатов через trustd), в deniedDomains нет "*";
- .claude/settings.json: allowedDomains — gateway.postman.com, dl-cli.pstmn.io, events.getpostman.com, skypermit.vercel.app;
  deniedDomains — api.anthropic.com, http-intake.logs.us5.datadoghq.com.

Если служебный домен Postman не решён заранее (висит вопрос песочницы или отказ), CLI обрывает загрузку коллекции: "collection could not be loaded … aborted".
