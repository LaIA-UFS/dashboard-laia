export const technologyGroups = {
  "Linguagens e desenvolvimento": ["Python", "R", "SQL", "Julia", "C++", "Java", "JavaScript", "TypeScript", "React", "Rust", "Bash"],
  "Ciência de dados": ["Numpy", "Pandas", "Polars", "SciPy", "Matplotlib", "Seaborn", "Plotly", "Jupyter", "Google Colab", "Apache Spark", "DuckDB"],
  "Aprendizado de máquina": ["scikit-learn", "PyTorch", "TensorFlow", "Keras", "JAX", "XGBoost", "LightGBM", "CatBoost", "Optuna", "ONNX"],
  "Visão computacional": ["OpenCV", "torchvision", "YOLO", "Detectron2", "MediaPipe", "Segment Anything", "Albumentations", "Roboflow"],
  "Linguagem e IA generativa": ["Hugging Face Transformers", "spaCy", "NLTK", "Sentence Transformers", "GPT", "Claude", "Gemini", "Llama", "Mistral", "Qwen", "DeepSeek", "Stable Diffusion", "Whisper", "Ollama", "vLLM", "LangChain", "LlamaIndex", "LangGraph", "FAISS", "pgvector", "Pinecone"],
  "MLOps e infraestrutura": ["Git", "GitHub Actions", "Docker", "Kubernetes", "MLflow", "DVC", "Weights & Biases", "Airflow", "Kubeflow", "FastAPI", "Ray", "AWS SageMaker", "Google Vertex AI", "Azure Machine Learning", "Databricks"],
} as const;

export const communicationGroups = {
  "Marketing e canais": ["Marketing", "Marketing digital", "Redes sociais", "Copywriting", "SEO", "Planejamento de campanhas", "Métricas de comunicação"],
  "Texto e comunicação institucional": ["Criação de conteúdo", "Redação de notícias", "Jornalismo", "Comunicação institucional", "Assessoria de comunicação", "Revisão de texto", "Entrevistas", "Cobertura de eventos"],
  "Design e audiovisual": ["Design gráfico", "Edição de vídeos", "Produção audiovisual", "Fotografia", "Ilustração", "Motion design", "Identidade visual", "Produção de áudio"],
} as const;

export const technologyNames = new Set<string>(Object.values(technologyGroups).flat());
export const communicationNames = new Set<string>(Object.values(communicationGroups).flat());
