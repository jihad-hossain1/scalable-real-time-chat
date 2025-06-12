deploy:
	docker-compose up -d

ssl:
	certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/.secrets/cloudflare.ini -d fullstackarmy.xyz -d www.fullstackarmy.xyz
