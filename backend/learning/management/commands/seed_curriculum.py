from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from learning.models import QuizQuestion, Skill, Topic, Track

# Each track: (name, icon, description, [ (skill_name, skill_description, [
#   (topic_name, description, difficulty, estimated_hours, resources), ...
# ]), ... ])
TRACKS = [
    (
        "Python Developer",
        "🐍",
        "Go from Python basics to building and shipping REST APIs with Django.",
        [
            (
                "Python Fundamentals",
                "The core language: syntax, data, and control flow.",
                [
                    ("Python Basics", "Interpreter, syntax, print/input, comments.", "easy", 2, "docs.python.org/3/tutorial"),
                    ("Variables & Data Types", "Numbers, strings, booleans, type conversion.", "easy", 2, ""),
                    ("Control Flow", "if/elif/else, loops, break/continue.", "easy", 2, ""),
                    ("Functions", "def, arguments, return values, scope, *args/**kwargs.", "medium", 3, ""),
                    ("Collections", "Lists, tuples, dicts, sets and comprehensions.", "medium", 3, ""),
                ],
            ),
            (
                "Object-Oriented Python",
                "Structuring larger programs with classes and clean error handling.",
                [
                    ("OOP Basics", "Classes, objects, __init__, instance vs class attributes.", "medium", 3, ""),
                    ("Inheritance & Polymorphism", "Subclassing, super(), method overriding.", "medium", 3, ""),
                    ("Exceptions", "try/except/finally, custom exceptions.", "medium", 2, ""),
                    ("Modules & Packages", "Imports, __init__.py, organizing a codebase.", "easy", 2, ""),
                ],
            ),
            (
                "Tooling & Version Control",
                "The everyday tools professional developers rely on.",
                [
                    ("Git & GitHub", "Commits, branches, pull requests, merge conflicts.", "easy", 3, ""),
                    ("Virtual Environments", "venv, pip, requirements.txt, dependency isolation.", "easy", 1, ""),
                    ("Debugging Techniques", "pdb, logging, reading tracebacks.", "medium", 2, ""),
                ],
            ),
            (
                "Working with Data",
                "Reading, storing and querying data like a real application.",
                [
                    ("File Handling", "Reading/writing files, context managers.", "easy", 2, ""),
                    ("JSON & CSV", "Parsing and generating structured data files.", "easy", 2, ""),
                    ("SQL Fundamentals", "SELECT, WHERE, JOIN, GROUP BY.", "medium", 4, ""),
                    ("Working with Databases (ORM)", "Django ORM models, querysets, migrations.", "medium", 4, ""),
                ],
            ),
            (
                "Web Development",
                "Building and exposing an API for real clients.",
                [
                    ("REST APIs", "HTTP verbs, status codes, resource design.", "medium", 3, ""),
                    ("Django Basics", "Project/app structure, views, urls, templates.", "medium", 4, ""),
                    ("Django REST Framework", "Serializers, viewsets, routers.", "hard", 5, ""),
                    ("Authentication & Testing", "JWT auth, permissions, writing API tests.", "hard", 4, ""),
                ],
            ),
            (
                "Capstone & Deployment",
                "Pulling it all together into something shippable.",
                [
                    ("Building a Project", "Planning and building an end-to-end app.", "hard", 6, ""),
                    ("Deployment Basics", "Environment variables, WSGI, a basic host.", "medium", 3, ""),
                    ("Code Review & Best Practices", "Readability, PEP8, review etiquette.", "easy", 2, ""),
                ],
            ),
        ],
    ),
    (
        "Frontend Developer",
        "🎨",
        "Build modern, interactive user interfaces with JavaScript and React.",
        [
            (
                "Web Fundamentals",
                "The building blocks of every web page.",
                [
                    ("HTML Essentials", "Semantic tags, forms, accessibility basics.", "easy", 2, ""),
                    ("CSS Fundamentals", "Box model, flexbox, grid, responsive design.", "easy", 3, ""),
                    ("JavaScript Basics", "Variables, functions, arrays, objects.", "easy", 3, ""),
                ],
            ),
            (
                "Modern JavaScript",
                "The language features that power modern frameworks.",
                [
                    ("ES6+ Syntax", "Arrow functions, destructuring, spread/rest.", "medium", 2, ""),
                    ("Async JavaScript", "Promises, async/await, fetch.", "medium", 3, ""),
                    ("DOM Manipulation", "Selecting, updating and listening on the DOM.", "medium", 2, ""),
                ],
            ),
            (
                "React",
                "Building component-based interfaces.",
                [
                    ("React Components & Props", "JSX, function components, props.", "medium", 3, ""),
                    ("State & Hooks", "useState, useEffect, custom hooks.", "medium", 4, ""),
                    ("Routing & Forms", "react-router, controlled forms, validation.", "medium", 3, ""),
                ],
            ),
            (
                "Shipping a Project",
                "Connecting to real data and going live.",
                [
                    ("Consuming REST APIs", "axios/fetch, loading & error states.", "medium", 3, ""),
                    ("Build Tools & Deployment", "Vite builds, environment config, static hosting.", "easy", 2, ""),
                ],
            ),
        ],
    ),
]

# topic_name -> [ (question, [a,b,c,d], correct_letter, explanation), ... ]
QUIZZES = {
    "Python Basics": [
        (
            "Which function prints text to the console in Python?",
            ["print()", "echo()", "console.log()", "write()"],
            "a",
            "print() writes to standard output in Python.",
        ),
        (
            "What symbol starts a single-line comment in Python?",
            ["//", "#", "--", "/*"],
            "b",
            "Python uses # for single-line comments.",
        ),
        (
            "What does input() return?",
            ["An integer", "A string", "A list", "A boolean"],
            "b",
            "input() always returns a string; you must convert it explicitly.",
        ),
    ],
    "Functions": [
        (
            "What keyword defines a function in Python?",
            ["func", "def", "function", "lambda"],
            "b",
            "Functions are defined with the def keyword.",
        ),
        (
            "What does **kwargs collect inside a function?",
            ["Positional args as a tuple", "Keyword args as a dict", "Nothing, it's invalid", "A single string"],
            "b",
            "**kwargs collects extra keyword arguments into a dictionary.",
        ),
        (
            "What is returned by a function with no explicit return statement?",
            ["0", "An empty string", "None", "An error is raised"],
            "c",
            "Python functions return None by default when no return statement executes.",
        ),
    ],
    "Collections": [
        (
            "Which collection type is immutable?",
            ["list", "dict", "tuple", "set"],
            "c",
            "Tuples cannot be modified after creation, unlike lists, dicts, and sets.",
        ),
        (
            "What does {x*2 for x in range(3)} produce?",
            ["A list", "A set", "A dict", "A generator only"],
            "b",
            "Curly braces with a single expression create a set comprehension.",
        ),
    ],
    "OOP Basics": [
        (
            "Which method is Python's constructor?",
            ["__new__", "__init__", "__start__", "construct()"],
            "b",
            "__init__ initializes a newly created instance.",
        ),
        (
            "What does 'self' refer to inside an instance method?",
            ["The class itself", "The current instance", "A global object", "Nothing, it's optional"],
            "b",
            "'self' is the conventional name for the instance the method was called on.",
        ),
    ],
    "Exceptions": [
        (
            "Which block always runs, whether or not an exception occurred?",
            ["try", "except", "else", "finally"],
            "d",
            "finally runs regardless of whether an exception was raised.",
        ),
        (
            "How do you catch a specific exception type?",
            ["except Exception as e:", "except ValueError:", "catch (ValueError):", "on ValueError:"],
            "b",
            "except <ExceptionType>: catches only that exception type (and its subclasses).",
        ),
    ],
    "SQL Fundamentals": [
        (
            "Which clause filters rows before grouping?",
            ["HAVING", "WHERE", "GROUP BY", "ORDER BY"],
            "b",
            "WHERE filters individual rows; HAVING filters after grouping.",
        ),
        (
            "Which SQL keyword combines rows from two tables based on a related column?",
            ["MERGE", "UNION", "JOIN", "LINK"],
            "c",
            "JOIN combines rows from two or more tables using a related column.",
        ),
    ],
    "REST APIs": [
        (
            "Which HTTP method is used to partially update a resource?",
            ["GET", "PATCH", "DELETE", "OPTIONS"],
            "b",
            "PATCH applies a partial update to a resource; PUT replaces it entirely.",
        ),
        (
            "Which status code means 'created'?",
            ["200", "201", "204", "301"],
            "b",
            "201 Created indicates a new resource was successfully created.",
        ),
    ],
    "HTML Essentials": [
        (
            "Which tag is used for the most important heading on a page?",
            ["<h6>", "<head>", "<h1>", "<title>"],
            "c",
            "<h1> represents the top-level heading.",
        ),
    ],
    "React Components & Props": [
        (
            "What do you call data passed from a parent component to a child?",
            ["State", "Props", "Hooks", "Context"],
            "b",
            "Props are read-only data passed down from a parent component.",
        ),
        (
            "What must a React function component return?",
            ["A string only", "JSX (or null)", "A class instance", "A Promise"],
            "b",
            "Function components return JSX describing the UI (or null to render nothing).",
        ),
    ],
    "State & Hooks": [
        (
            "Which hook lets a function component hold local state?",
            ["useEffect", "useState", "useRef", "useContext"],
            "b",
            "useState returns a state value and a setter function.",
        ),
    ],
}


class Command(BaseCommand):
    help = "Seed SkillSprint with sample tracks, skills, topics and quiz questions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing tracks/skills/topics/quizzes before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            Track.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing curriculum."))

        track_count = skill_count = topic_count = question_count = 0

        for track_name, icon, description, skills in TRACKS:
            track, _ = Track.objects.update_or_create(
                name=track_name,
                defaults={"slug": slugify(track_name), "description": description, "icon": icon},
            )
            track_count += 1

            for s_idx, (skill_name, skill_description, topics) in enumerate(skills):
                skill, _ = Skill.objects.update_or_create(
                    track=track,
                    name=skill_name,
                    defaults={"description": skill_description, "order_index": s_idx},
                )
                skill_count += 1

                for t_idx, (topic_name, topic_description, difficulty, hours, resources) in enumerate(topics):
                    topic, _ = Topic.objects.update_or_create(
                        skill=skill,
                        name=topic_name,
                        defaults={
                            "description": topic_description,
                            "difficulty": difficulty,
                            "estimated_hours": hours,
                            "resources": resources,
                            "order_index": t_idx,
                        },
                    )
                    topic_count += 1

                    for question_text, options, correct, explanation in QUIZZES.get(topic_name, []):
                        _, created = QuizQuestion.objects.update_or_create(
                            topic=topic,
                            question_text=question_text,
                            defaults={
                                "option_a": options[0],
                                "option_b": options[1],
                                "option_c": options[2],
                                "option_d": options[3],
                                "correct_option": correct,
                                "explanation": explanation,
                            },
                        )
                        if created:
                            question_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {track_count} tracks, {skill_count} skills, {topic_count} topics, "
                f"{question_count} quiz questions."
            )
        )
