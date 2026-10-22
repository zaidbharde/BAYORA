FROM python:3.12-slim
WORKDIR /app
COPY app/hello.py /app/hello.py
USER 10001:10001
EXPOSE 8000
CMD ["python", "/app/hello.py"]
