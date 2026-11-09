INSERT INTO categories(name) VALUES ('Computer Science'),('Mathematics'),('Physics'),('Languages');
--> statement-breakpoint
INSERT INTO subjects(name) VALUES ('Python Programming'),('Web Development'),('Calculus'),('Linear Algebra'),('Mechanics'),('English Conversation'),('Academic Writing');
--> statement-breakpoint
INSERT INTO subject_categories(subject_id,category_id)
SELECT s.id,c.id FROM (VALUES
('Python Programming','Computer Science'),('Web Development','Computer Science'),('Calculus','Mathematics'),('Linear Algebra','Mathematics'),('Mechanics','Physics'),('English Conversation','Languages'),('Academic Writing','Languages')) fixture(subject,category)
JOIN subjects s ON s.name=fixture.subject JOIN categories c ON c.name=fixture.category;
