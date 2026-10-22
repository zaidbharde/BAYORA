FROM python:3.12-slim
WORKDIR /app
COPY app/hello.py /app/hello.py
COPY red_engine/runner.py /app/red_engine/runner.py
COPY red_engine/eval_runner.py /app/red_engine/eval_runner.py
USER 10001:10001
EXPOSE 8000
CMD ["python", "/app/hello.py"]
