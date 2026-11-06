from setuptools import setup, find_packages

setup(
    name="hira-template",
    version="1.0.0",
    description="Real, advanced, high-performance Python template engine with LRU caching, AST parser, and zero dependencies.",
    author="codewithhira-cwh",
    author_email="resuhira@gmail.com",
    url="https://github.com/codewithhira-cwh/",
    packages=["engine", "hira_template"],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
)
