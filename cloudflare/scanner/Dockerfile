# Rebuild with --pull before deployment to receive the current official engine/signatures.
FROM clamav/clamav:stable
USER root
RUN apk add --no-cache python3 && mkdir -p /opt/scanner /dev/shm/clamav && chown clamav:clamav /dev/shm/clamav
COPY scanner.py start.sh clamd.conf /opt/scanner/
RUN chmod 0555 /opt/scanner/start.sh && chmod 0444 /opt/scanner/scanner.py /opt/scanner/clamd.conf
USER clamav
EXPOSE 8080
ENTRYPOINT ["/sbin/tini","--","/bin/sh","/opt/scanner/start.sh"]
