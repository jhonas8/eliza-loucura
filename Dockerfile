#
FROM python:3.9

#
ENV APP_HOME /app
WORKDIR $APP_HOME

#
COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt

#
COPY . .

#
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
