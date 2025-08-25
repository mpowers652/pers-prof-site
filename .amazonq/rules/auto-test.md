When any new functionality is introduced, a series of tests must be written to confirm the functionality exists. 
If the expected functionality does not work as expected, re-assess the basis of the functionality such that the tests pass.
If the tests pass, but the functionality does not work as expected, re-assess the tests such that they fail.
Tests must be automated and run as part of the continuous integration process.
Tests must be written in a way that they can be run repeatedly and consistently.
Tests must be written in a way that they can be run in isolation, without dependencies on other tests.
If a service would augment the system framework in any way, an integration and a system test must be written in addition to a unit test, assuming they do not already exist.