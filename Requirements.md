**REQUIREMENTS 001**

# Exam Schedule

## Teacher View

Teacher filter currently allows only to select one teacher, it should be changed to MultiSelectDropdown allowing to select All, multiple or single teacher. Subview to display the multiple tables each table represents a single teacher.

## Scheduler:

Swap Selected Class and All Classes sequence. Default should be All Classes. Remove the 'Class:' before the dropdown and change the dropdown to MultiSelectDropdown

## Notice Board Print

use the MultiSelectDropdown for the Classes. Move the filters and Class View, Scheduler, Block View buttons to top bar above the selection controls and keep them in left. Add a gear icon next to print, it should have following option to apply the design to the below table irrespective of the view.

Gear icon to have options to be saved in admin_configuration table as exam_notice_board_config key. it should capture header color, font size, row height, border, banded row, banded column, column width, primary font color, secondary font color, Header Text, Header Image, etc., this needs to be applied to the notice board all the tables generated, lets have the default one added first to the table to see how it looks. for now keep a simple style and then we will enhance it.

## Parent Portal

Parent portal doesn't have option to see their ward exam time table

# Exam Results Entry (exam-results)

## Results Entry

Results Entry edit access to be extended to subject teacher (whom the subject in that class is allocated to)

Results Entry needs complete redesign. Move the subject selection from left navigation to MultiSelectDropdown and it should be loaded based on the class selected. It should allow to select multiple subjects. The below table should allow the marks entry for all the selected subjects in a single view. The respective subject column will be editable only for the subject assigned to the logged in teacher, invigilator of that subject and the coordinator. Rest all should be read only. Do the necessary changes to the db table if required. Max Marks should be configurable for the the subject.

## Progress Report

1. Progress report generating feature needs to be added, generate by exam, for entire class or selected students
2. While generating the report card it should provide a feature to design the template, headers, footers, tables, placement of objects, etc. using a drag and drop interface, which allows to add text, image, table, etc., into the report card.
3. it should allow to add the charts, graphs and pdf to the report card.
4. It should have the ability to provide the calculations based on the marks obtained by the student in the form of tables, charts, graphs, etc.
5. it should allow to group the subjects under one title e.g. for Physics, Chemistry, Biology place them under Science. It should ask for the grouping name instead of guessing on its own

# Dashboard

## Weekly Book Progress Trend

Book dropdown should be changed to MultiSelectDropdown, it should allow to select all, multiple and single

# General

## Role Hierarchy

when user has the multiple roles, it should apply the priority in following sequence admin, management, teacher, staff, <custom role> and finally parent. this needs to be centrally handled instead of every places updating individual role conditions.

when top role is not elible for a feature, it should apply the next role's eligibility and so on. for example if admin cannot view a feature, it should apply the management's eligibility, if management cannot view then teacher's, then staff's, then custom role's, then parent's.

## Cache

whenever new changes are made, it should auto update the cache to deployed version instead of using older cache

## Network Call on Page Activation

Verify if the api are getting called again and aging when the browser gets activated
